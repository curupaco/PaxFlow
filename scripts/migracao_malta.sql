-- ============================================================================
-- SCRIPT DE MIGRAÇÃO TRANSACIONAL — MALTA VIAGENS
-- Tag de Auditoria e Rollback: MIGRACAO_MALTA_20260909
-- Totalmente Idempotente: Reaproveita clientes existentes e evita duplicidade de viagens
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_cliente_id UUID;
  v_consultor_id UUID;
  v_count_viagens INT := 0;
  v_count_clientes INT := 0;
BEGIN
  RAISE NOTICE 'Iniciando carga do lote MIGRACAO_MALTA_20260909...';

  -- ============================================================================
  -- Cliente: Mauricio Neves Fonseca (ID Legado: #1021)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('juridico.m@uol.com.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11983694423' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Mauricio Neves Fonseca') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Mauricio Neves Fonseca',
        'juridico.m@uol.com.br',
        '11 98369-4423',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1021)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('juridico.m@uol.com.br')) OR LOWER(nome) = LOWER('Mauricio Neves Fonseca'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Barcelona (#4302)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4302' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Barcelona',
      '2026-09-13'::DATE,
      '2026-09-17'::DATE,
      9500,
      'pre_embarque',
      '#4302',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4302
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2025-10-15 17:00:00
• Serviços Contratados:
  - AGAXTUR - Hotel
================================================',
      '2025-10-15'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Barcelona (#4270)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4270' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Barcelona',
      '2026-09-17'::DATE,
      '2026-09-24'::DATE,
      2304,
      'pos_venda',
      '#4270',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4270
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2025-10-11 19:10:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2025-10-11'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Barcelona (#4982)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4982' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Barcelona',
      '2026-09-17'::DATE,
      '2026-09-24'::DATE,
      652,
      'pos_venda',
      '#4982',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4982
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-03 12:21:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-03'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Maceió (#4992)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4992' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Maceió',
      '2027-08-07'::DATE,
      '2027-08-14'::DATE,
      4648.29,
      'pos_venda',
      '#4992',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4992
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-10 15:10:00
• Serviços Contratados:
  - AGAXTUR - Hotel
================================================',
      '2026-08-10'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Barcelona (#5040)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5040' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Barcelona',
      '2027-09-04'::DATE,
      '2027-09-11'::DATE,
      5054,
      'pos_venda',
      '#5040',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5040
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-28 14:27:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-28'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Barcelona (#4278)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4278' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Barcelona',
      '2026-09-12'::DATE,
      '2026-09-25'::DATE,
      9665,
      'pre_embarque',
      '#4278',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4278
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2025-10-11 19:56:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2025-10-11'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Barcelona (#4279)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4279' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Barcelona',
      '2026-09-12'::DATE,
      '2026-09-25'::DATE,
      16478.08,
      'pre_embarque',
      '#4279',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4279
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2025-10-11 20:01:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Executiva
================================================',
      '2025-10-11'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Barcelona (#4583)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4583' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Barcelona',
      '2026-09-12'::DATE,
      '2026-09-26'::DATE,
      1840,
      'pre_embarque',
      '#4583',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4583
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-02-09 16:37:00
• Serviços Contratados:
  - AGAXTUR - Seguro Viagem
================================================',
      '2026-02-09'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Leonardo Matiazzo (ID Legado: #1894)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11997187760' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Leonardo Matiazzo') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Leonardo Matiazzo',
        NULL,
        '11 99718-7760',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1894)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Leonardo Matiazzo'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Paris (#4816)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4816' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Paris',
      '2026-09-13'::DATE,
      '2026-09-27'::DATE,
      56874.09,
      'pre_embarque',
      '#4816',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4816
• Consultor Original: Maria
• Data Abertura Legada: 2026-05-21 21:07:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-05-21'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Paris (#4851)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4851' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Paris',
      '2026-09-19'::DATE,
      '2026-09-19'::DATE,
      799.14,
      'pos_venda',
      '#4851',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4851
• Consultor Original: Malta
• Data Abertura Legada: 2026-06-08 17:08:00
• Serviços Contratados:
  - AGAXTUR - Serviços
• Observação Operacional: Data de retorno não constava na planilha original (assumida mesma data de embarque).
================================================',
      '2026-06-08'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Celso Marques De Oliveira (ID Legado: #1629)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('celsomrqs@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11986946120' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Celso Marques De Oliveira') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Celso Marques De Oliveira',
        'celsomrqs@gmail.com',
        '11 98694-6120',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1629)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('celsomrqs@gmail.com')) OR LOWER(nome) = LOWER('Celso Marques De Oliveira'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Paris (#4919)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4919' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Paris',
      '2026-09-14'::DATE,
      '2026-09-14'::DATE,
      3467.8,
      'pre_embarque',
      '#4919',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4919
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-07 15:55:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
• Observação Operacional: Data de retorno não constava na planilha original (assumida mesma data de embarque).
================================================',
      '2026-07-07'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Paris (#4917)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4917' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Paris',
      '2026-09-01'::DATE,
      '2026-09-15'::DATE,
      57016.62,
      'pre_embarque',
      '#4917',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4917
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-07 15:50:00
• Serviços Contratados:
  - AGAXTUR - Hotel
  - AGAXTUR - Serviços
• Contato Pré-Embarque Legado: check-in ok!
• Contato Pós-Viagem Legado: Realizado
================================================',
      '2026-07-07'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Gabriel Beltrame (ID Legado: #2089)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11980541890' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Gabriel Beltrame') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Gabriel Beltrame',
        NULL,
        '11 98054-1890',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2089)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Gabriel Beltrame'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Roma (#4850)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4850' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-09-15'::DATE,
      '2026-09-17'::DATE,
      2352.44,
      'pre_embarque',
      '#4850',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4850
• Consultor Original: Malta
• Data Abertura Legada: 2026-06-08 17:02:00
• Serviços Contratados:
  - AGAXTUR - Hotel
================================================',
      '2026-06-08'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Roma (#4849)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4849' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-08-29'::DATE,
      '2026-09-15'::DATE,
      16441.31,
      'pre_embarque',
      '#4849',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4849
• Consultor Original: Malta
• Data Abertura Legada: 2026-06-08 16:57:00
• Serviços Contratados:
  - AGAXTUR - Hotel
================================================',
      '2026-06-08'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Roma (#4715)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4715' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-08-28'::DATE,
      '2026-09-17'::DATE,
      17024.56,
      'pre_embarque',
      '#4715',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4715
• Consultor Original: Malta
• Data Abertura Legada: 2026-04-06 19:46:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-04-06'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Miriam Moreno Bansho (ID Legado: #2067)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11972717733' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Miriam Moreno Bansho') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Miriam Moreno Bansho',
        NULL,
        '11 97271-7733',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2067)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Miriam Moreno Bansho'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Milão (#4835)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4835' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Milão',
      '2026-09-16'::DATE,
      '2026-09-30'::DATE,
      58399.71,
      'pre_embarque',
      '#4835',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4835
• Consultor Original: Cadu
• Data Abertura Legada: 2026-05-29 16:26:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Executiva
================================================',
      '2026-05-29'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Milão (#4942)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4942' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Milão',
      '2026-09-16'::DATE,
      '2026-10-01'::DATE,
      1599.54,
      'pre_embarque',
      '#4942',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4942
• Consultor Original: Malta
• Data Abertura Legada: 2026-07-18 17:39:00
• Serviços Contratados:
  - AGAXTUR - Seguro Viagem
================================================',
      '2026-07-18'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Lisboa (#4898)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4898' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Lisboa',
      '2027-03-28'::DATE,
      '2027-03-28'::DATE,
      10427.5,
      'pos_venda',
      '#4898',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4898
• Consultor Original: Malta
• Data Abertura Legada: 2026-06-28 16:51:00
• Serviços Contratados:
  - AGAXTUR - Serviços
  - AGAXTUR - Serviços
• Observação Operacional: Data de retorno não constava na planilha original (assumida mesma data de embarque).
================================================',
      '2026-06-28'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Josely Marchi Chiarella (ID Legado: #2162)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('josely.chiarella@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11968631333' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Josely Marchi Chiarella') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Josely Marchi Chiarella',
        'josely.chiarella@gmail.com',
        '11 96863-1333',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2162)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('josely.chiarella@gmail.com')) OR LOWER(nome) = LOWER('Josely Marchi Chiarella'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Lisboa (#5019)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5019' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Lisboa',
      '2026-09-17'::DATE,
      '2026-09-17'::DATE,
      0,
      'pos_venda',
      '#5019',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5019
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-20 16:57:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
• Observação Operacional: Data de retorno não constava na planilha original (assumida mesma data de embarque).
================================================',
      '2026-08-20'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Singapura (#5018)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5018' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Singapura',
      '2026-09-09'::DATE,
      '2026-09-24'::DATE,
      19001.57,
      'pre_embarque',
      '#5018',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5018
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-20 16:47:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-08-20'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Gabriella Cardoso Franco (ID Legado: #850)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11976678715' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Gabriella Cardoso Franco') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Gabriella Cardoso Franco',
        NULL,
        '11 97667-8715',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #850)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Gabriella Cardoso Franco'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Florianópolis (#5027)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5027' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Florianópolis',
      '2026-09-18'::DATE,
      '2026-09-20'::DATE,
      2455.94,
      'pos_venda',
      '#5027',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5027
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-24 20:29:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-08-24'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Ana Maria Abrantes Mendes Kolisch (ID Legado: #1974)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('anakolisch@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11940775010' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Ana Maria Abrantes Mendes Kolisch') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Ana Maria Abrantes Mendes Kolisch',
        'anakolisch@gmail.com',
        '11 94077-5010',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1974)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('anakolisch@gmail.com')) OR LOWER(nome) = LOWER('Ana Maria Abrantes Mendes Kolisch'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Atenas (#4260)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4260' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Atenas',
      '2026-09-20'::DATE,
      '2026-09-27'::DATE,
      17925.36,
      'pos_venda',
      '#4260',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4260
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2025-10-08 20:29:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiros
================================================',
      '2025-10-08'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Atenas (#4678)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4678' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Atenas',
      '2026-09-29'::DATE,
      '2026-10-01'::DATE,
      8549.34,
      'pos_venda',
      '#4678',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4678
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-03-20 21:46:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Hotel
================================================',
      '2026-03-20'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: K2 Partnering Solutions (ID Legado: #1739)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11988828898' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('K2 Partnering Solutions') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'K2 Partnering Solutions',
        NULL,
        '11 98882-8898',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1739)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('K2 Partnering Solutions'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Nova Iorque (#5028)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5028' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Nova Iorque',
      '2026-09-20'::DATE,
      '2026-09-24'::DATE,
      12395.03,
      'pos_venda',
      '#5028',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5028
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-24 23:51:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-08-24'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Orlando (#4641)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4641' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Orlando',
      '2026-11-24'::DATE,
      '2026-12-05'::DATE,
      4202.49,
      'pos_venda',
      '#4641',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4641
• Consultor Original: Maria
• Data Abertura Legada: 2026-03-09 13:19:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-03-09'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Nova Iorque (#4767)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4767' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Nova Iorque',
      '2026-12-02'::DATE,
      '2026-12-04'::DATE,
      10697.93,
      'pos_venda',
      '#4767',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4767
• Consultor Original: Maria
• Data Abertura Legada: 2026-04-22 16:15:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Hotel
================================================',
      '2026-04-22'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Curitiba (#5029)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5029' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Curitiba',
      '2026-12-03'::DATE,
      '2026-12-04'::DATE,
      2179.24,
      'pos_venda',
      '#5029',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5029
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-25 16:19:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Hotel
================================================',
      '2026-08-25'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Curitiba (#5034)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5034' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Curitiba',
      '2026-09-02'::DATE,
      '2026-10-06'::DATE,
      8969.98,
      'pre_embarque',
      '#5034',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5034
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-28 12:58:00
• Serviços Contratados:
  - AGAXTUR - Hotel
• Contato Pós-Viagem Legado: Realizado
================================================',
      '2026-08-28'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Walter Christian Folz (ID Legado: #1069)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11996231977' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Walter Christian Folz') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Walter Christian Folz',
        NULL,
        '11 99623-1977',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1069)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Walter Christian Folz'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Los Angeles (#4966)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4966' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Los Angeles',
      '2026-09-21'::DATE,
      '2026-10-02'::DATE,
      18987.28,
      'pos_venda',
      '#4966',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4966
• Consultor Original: Guto
• Data Abertura Legada: 2026-07-25 12:46:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Hotel
================================================',
      '2026-07-25'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Rosana Aparecida Pires Monteiro Runza (ID Legado: #2076)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('rmrunza@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11998537671' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Rosana Aparecida Pires Monteiro Runza') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Rosana Aparecida Pires Monteiro Runza',
        'rmrunza@gmail.com',
        '11 99853-7671',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2076)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('rmrunza@gmail.com')) OR LOWER(nome) = LOWER('Rosana Aparecida Pires Monteiro Runza'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Maceió (#4905)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4905' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Maceió',
      '2026-09-22'::DATE,
      '2026-09-29'::DATE,
      9519.95,
      'pos_venda',
      '#4905',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4905
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-07-01 22:25:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-01'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Cristina Sakura Nakajima (ID Legado: #2146)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11996554372' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Cristina Sakura Nakajima') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Cristina Sakura Nakajima',
        NULL,
        '11 99655-4372',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2146)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Cristina Sakura Nakajima'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Lisboa (#4962)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4962' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Lisboa',
      '2026-09-23'::DATE,
      '2026-09-28'::DATE,
      11774.05,
      'pos_venda',
      '#4962',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4962
• Consultor Original: Maria
• Data Abertura Legada: 2026-07-24 16:54:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-24'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Lisboa (#4965)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4965' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Lisboa',
      '2026-09-23'::DATE,
      '2026-09-28'::DATE,
      9404.97,
      'pos_venda',
      '#4965',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4965
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-07-24 18:36:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-24'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Ana Maria Pinto (ID Legado: #1877)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('anamariaspinto@yahoo.com.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11987280794' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Ana Maria Pinto') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Ana Maria Pinto',
        'anamariaspinto@yahoo.com.br',
        '11 98728-0794',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1877)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('anamariaspinto@yahoo.com.br')) OR LOWER(nome) = LOWER('Ana Maria Pinto'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Lisboa (#4894)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4894' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Lisboa',
      '2026-09-24'::DATE,
      '2026-10-15'::DATE,
      33943.96,
      'pos_venda',
      '#4894',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4894
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-06-25 18:39:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Executiva
================================================',
      '2026-06-25'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Gilberto Jose Feres (ID Legado: #2140)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('gilberto.feres@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11996216596' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Gilberto Jose Feres') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Gilberto Jose Feres',
        'gilberto.feres@gmail.com',
        '11 99621-6596',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2140)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('gilberto.feres@gmail.com')) OR LOWER(nome) = LOWER('Gilberto Jose Feres'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Istambul (#4936)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4936' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Istambul',
      '2026-09-24'::DATE,
      '2026-10-07'::DATE,
      86987.56,
      'pos_venda',
      '#4936',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4936
• Consultor Original: Guto
• Data Abertura Legada: 2026-07-16 19:34:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Cruzeiros
================================================',
      '2026-07-16'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Istambul (#4946)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4946' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Istambul',
      '2026-09-25'::DATE,
      '2026-10-07'::DATE,
      19726.27,
      'pos_venda',
      '#4946',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4946
• Consultor Original: Guto
• Data Abertura Legada: 2026-07-21 15:29:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-21'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Rosa Maria Guedes (ID Legado: #1176)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('rosa.guedes@uol.com.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11942357688' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Rosa Maria Guedes') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Rosa Maria Guedes',
        'rosa.guedes@uol.com.br',
        '11 94235-7688',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1176)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('rosa.guedes@uol.com.br')) OR LOWER(nome) = LOWER('Rosa Maria Guedes'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Viena (#4663)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4663' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Viena',
      '2026-09-26'::DATE,
      '2026-10-05'::DATE,
      49239.75,
      'pos_venda',
      '#4663',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4663
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-03-15 20:34:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Circuitos
================================================',
      '2026-03-15'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Natalia Bamonte Rodrigues (ID Legado: #1300)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11991259397' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Natalia Bamonte Rodrigues') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Natalia Bamonte Rodrigues',
        NULL,
        '11 99125-9397',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1300)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Natalia Bamonte Rodrigues'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: AMSTERDAM (#4801)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4801' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'AMSTERDAM',
      '2026-09-26'::DATE,
      '2026-10-12'::DATE,
      13546.33,
      'pos_venda',
      '#4801',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4801
• Consultor Original: Maria
• Data Abertura Legada: 2026-05-18 15:09:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Operadora
================================================',
      '2026-05-18'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Maisa Pestana (ID Legado: #2167)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11981083820' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Maisa Pestana') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Maisa Pestana',
        NULL,
        '11 981083820',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2167)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Maisa Pestana'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Milão (#5038)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5038' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Milão',
      '2026-09-29'::DATE,
      '2026-10-02'::DATE,
      4513.24,
      'pos_venda',
      '#5038',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5038
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-28 13:51:00
• Serviços Contratados:
  - AGAXTUR - Serviços
================================================',
      '2026-08-28'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Yara Dagmar Rodrigues Masaki (ID Legado: #2139)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11993915282' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Yara Dagmar Rodrigues Masaki') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Yara Dagmar Rodrigues Masaki',
        NULL,
        '11 993915282',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2139)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Yara Dagmar Rodrigues Masaki'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Roma (#4934)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4934' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-09-30'::DATE,
      '2026-10-08'::DATE,
      21775.5,
      'pos_venda',
      '#4934',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4934
• Consultor Original: Maria
• Data Abertura Legada: 2026-07-16 19:31:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-16'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Patricia Botelho Da Silva (ID Legado: #2151)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('patriciabotsilva@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11957961045' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Patricia Botelho Da Silva') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Patricia Botelho Da Silva',
        'patriciabotsilva@gmail.com',
        '11 95796-1045',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2151)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('patriciabotsilva@gmail.com')) OR LOWER(nome) = LOWER('Patricia Botelho Da Silva'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Penha (Beto Carrero) (#4986)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4986' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Penha (Beto Carrero)',
      '2026-09-30'::DATE,
      '2026-10-03'::DATE,
      5221.72,
      'pos_venda',
      '#4986',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4986
• Consultor Original: Malta
• Data Abertura Legada: 2026-08-05 18:40:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-08-05'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Ana Luisa Ariolli (ID Legado: #2121)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('analuariolli@hotmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999829160' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Ana Luisa Ariolli') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Ana Luisa Ariolli',
        'analuariolli@hotmail.com',
        '11 999829160',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2121)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('analuariolli@hotmail.com')) OR LOWER(nome) = LOWER('Ana Luisa Ariolli'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Roma (#4846)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4846' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-10-02'::DATE,
      '2026-10-20'::DATE,
      10895.03,
      'pos_venda',
      '#4846',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4846
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-06-06 20:29:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-06-06'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Sonia Crespo Vilar (ID Legado: #1831)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('soniacvilar@uol.com.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999347755' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Sonia Crespo Vilar') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Sonia Crespo Vilar',
        'soniacvilar@uol.com.br',
        '11 99934-7755',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1831)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('soniacvilar@uol.com.br')) OR LOWER(nome) = LOWER('Sonia Crespo Vilar'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Nova Iorque (#4865)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4865' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Nova Iorque',
      '2026-10-02'::DATE,
      '2026-10-12'::DATE,
      13459.88,
      'pos_venda',
      '#4865',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4865
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-06-12 12:56:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-06-12'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Juliana De Barros Isidro (ID Legado: #2150)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('juliana.isidro@hotmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  -- (Sem telefone numérico)

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Juliana De Barros Isidro') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Juliana De Barros Isidro',
        'juliana.isidro@hotmail.com',
        '',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2150)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('juliana.isidro@hotmail.com')) OR LOWER(nome) = LOWER('Juliana De Barros Isidro'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Nova Iorque (#4983)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4983' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Nova Iorque',
      '2026-10-02'::DATE,
      '2026-10-11'::DATE,
      38296.89,
      'pos_venda',
      '#4983',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4983
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-03 19:14:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Hotel
================================================',
      '2026-08-03'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Maria Del Carmen Alvarez Cervino (ID Legado: #1850)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11991633064' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Maria Del Carmen Alvarez Cervino') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Maria Del Carmen Alvarez Cervino',
        NULL,
        '11 99163-3064',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1850)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Maria Del Carmen Alvarez Cervino'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Gênova (#4452)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4452' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Gênova',
      '2026-10-03'::DATE,
      '2026-10-17'::DATE,
      37634.2,
      'pos_venda',
      '#4452',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4452
• Consultor Original: Guto
• Data Abertura Legada: 2025-12-05 18:55:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2025-12-05'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Trieste (#4786)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4786' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Trieste',
      '2026-10-21'::DATE,
      '2026-10-28'::DATE,
      7860,
      'pos_venda',
      '#4786',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4786
• Consultor Original: Guto
• Data Abertura Legada: 2026-04-30 16:40:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-04-30'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Irene Almeida De Sa Leme (ID Legado: #2153)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11998301722' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Irene Almeida De Sa Leme') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Irene Almeida De Sa Leme',
        NULL,
        '11 998301722',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2153)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Irene Almeida De Sa Leme'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Roma (#4990)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4990' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-10-03'::DATE,
      '2026-10-15'::DATE,
      88970.36,
      'pos_venda',
      '#4990',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4990
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-08 16:12:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Circuitos
  - AGAXTUR - Seguro Viagem
  - CIAS AÉREAS - Assento/bagagem
================================================',
      '2026-08-08'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Antonio Carlos De Oliveira (ID Legado: #2152)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('coliveira@controle.net') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999917179' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Antonio Carlos De Oliveira') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Antonio Carlos De Oliveira',
        'coliveira@controle.net',
        '11 99991-7179',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2152)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('coliveira@controle.net')) OR LOWER(nome) = LOWER('Antonio Carlos De Oliveira'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Istambul (#4987)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4987' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Istambul',
      '2026-10-04'::DATE,
      '2026-10-13'::DATE,
      40640.4,
      'pos_venda',
      '#4987',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4987
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-06 16:40:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Circuitos
================================================',
      '2026-08-06'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Fernando Cesar Pereira Silva (ID Legado: #1344)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('fecepe@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11969027571' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Fernando Cesar Pereira Silva') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Fernando Cesar Pereira Silva',
        'fecepe@gmail.com',
        '11 96902-7571',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1344)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('fecepe@gmail.com')) OR LOWER(nome) = LOWER('Fernando Cesar Pereira Silva'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Rio de Janeiro (#5044)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5044' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Rio de Janeiro',
      '2026-10-05'::DATE,
      '2026-10-08'::DATE,
      4801.61,
      'pos_venda',
      '#5044',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5044
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-29 20:26:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-08-29'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Wilma Leamari Dos Santos (ID Legado: #1678)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('wilmaleamari@hotmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999767481' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Wilma Leamari Dos Santos') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Wilma Leamari Dos Santos',
        'wilmaleamari@hotmail.com',
        '11 99976-7481',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1678)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('wilmaleamari@hotmail.com')) OR LOWER(nome) = LOWER('Wilma Leamari Dos Santos'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Salvador (#5045)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5045' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Salvador',
      '2026-10-05'::DATE,
      '2026-10-05'::DATE,
      1200,
      'pos_venda',
      '#5045',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5045
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-08-29 21:22:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
• Observação Operacional: Data de retorno não constava na planilha original (assumida mesma data de embarque).
================================================',
      '2026-08-29'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Maria Elena Via (ID Legado: #1940)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('mevia@uol.com.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11991636596' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Maria Elena Via') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Maria Elena Via',
        'mevia@uol.com.br',
        '11 991636596',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1940)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('mevia@uol.com.br')) OR LOWER(nome) = LOWER('Maria Elena Via'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Porto de Galinhas (#5026)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5026' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Porto de Galinhas',
      '2026-10-06'::DATE,
      '2026-10-17'::DATE,
      47600,
      'pos_venda',
      '#5026',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5026
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-08-24 15:38:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-08-24'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Andrea Cristina Pimentel Palazzolo (ID Legado: #1675)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999683005' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Andrea Cristina Pimentel Palazzolo') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Andrea Cristina Pimentel Palazzolo',
        NULL,
        '11 99968-3005',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1675)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Andrea Cristina Pimentel Palazzolo'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Fernando de Noronha (#4687)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4687' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Fernando de Noronha',
      '2026-10-09'::DATE,
      '2026-10-14'::DATE,
      25027.47,
      'pos_venda',
      '#4687',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4687
• Consultor Original: Cadu
• Data Abertura Legada: 2026-03-23 15:29:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
  - CIAS AÉREAS - Assento/bagagem
================================================',
      '2026-03-23'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Iraci Maria Petriw (ID Legado: #2091)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11992466179' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Iraci Maria Petriw') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Iraci Maria Petriw',
        NULL,
        '11 99246-6179',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2091)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Iraci Maria Petriw'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Roma (#4726)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4726' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-10-10'::DATE,
      '2026-10-20'::DATE,
      41850.63,
      'pos_venda',
      '#4726',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4726
• Consultor Original: Guto
• Data Abertura Legada: 2026-04-08 18:11:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Circuitos
================================================',
      '2026-04-08'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Roma (#4954)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4954' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-10-10'::DATE,
      '2026-10-20'::DATE,
      4974.54,
      'pos_venda',
      '#4954',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4954
• Consultor Original: Guto
• Data Abertura Legada: 2026-07-22 19:12:00
• Serviços Contratados:
  - AGAXTUR - Serviços
================================================',
      '2026-07-22'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Jose Carlos Costa Netto (ID Legado: #1087)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('jcostanetto@tjsp.jus.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11982618742' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Jose Carlos Costa Netto') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Jose Carlos Costa Netto',
        'jcostanetto@tjsp.jus.br',
        '11 98261-8742',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1087)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('jcostanetto@tjsp.jus.br')) OR LOWER(nome) = LOWER('Jose Carlos Costa Netto'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Genebra (#4781)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4781' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Genebra',
      '2026-10-11'::DATE,
      '2026-10-17'::DATE,
      28536.98,
      'pos_venda',
      '#4781',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4781
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-04-27 21:33:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Executiva
================================================',
      '2026-04-27'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Genebra (#4976)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4976' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Genebra',
      '2026-10-11'::DATE,
      '2026-10-17'::DATE,
      1004.99,
      'pos_venda',
      '#4976',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4976
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-01 11:38:00
• Serviços Contratados:
  - AGAXTUR - Seguro Viagem
================================================',
      '2026-08-01'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Flavia Damiani Mascarenhas (ID Legado: #2134)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('flaviamdamiani@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11998230816' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Flavia Damiani Mascarenhas') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Flavia Damiani Mascarenhas',
        'flaviamdamiani@gmail.com',
        '11 998230816',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2134)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('flaviamdamiani@gmail.com')) OR LOWER(nome) = LOWER('Flavia Damiani Mascarenhas'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Tóquio (#4899)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4899' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Tóquio',
      '2026-10-13'::DATE,
      '2026-10-30'::DATE,
      53888.36,
      'pos_venda',
      '#4899',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4899
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-06-28 19:49:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Hotel
================================================',
      '2026-06-28'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Maria Da Graca Nogueira (ID Legado: #1631)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('m.nogueira.a@uol.com.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '13991250291' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Maria Da Graca Nogueira') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Maria Da Graca Nogueira',
        'm.nogueira.a@uol.com.br',
        '13 99125-0291',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1631)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('m.nogueira.a@uol.com.br')) OR LOWER(nome) = LOWER('Maria Da Graca Nogueira'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Montevideo (#5033)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5033' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Montevideo',
      '2026-10-13'::DATE,
      '2026-10-18'::DATE,
      10067.24,
      'pos_venda',
      '#5033',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5033
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-27 20:27:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-08-27'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Victor Matheus Fushimi Durante (ID Legado: #2085)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('victor.fushimi@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999100968' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Victor Matheus Fushimi Durante') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Victor Matheus Fushimi Durante',
        'victor.fushimi@gmail.com',
        '11 999100968',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2085)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('victor.fushimi@gmail.com')) OR LOWER(nome) = LOWER('Victor Matheus Fushimi Durante'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Roma (#4695)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4695' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-10-18'::DATE,
      '2026-10-29'::DATE,
      17665.64,
      'pos_venda',
      '#4695',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4695
• Consultor Original: Guto
• Data Abertura Legada: 2026-03-25 18:22:00
• Serviços Contratados:
  - AGAXTUR - Hotel
================================================',
      '2026-03-25'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Edson Jose Viana (ID Legado: #38)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('edsonviana74@outlook.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11994044979' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Edson Jose Viana') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Edson Jose Viana',
        'edsonviana74@outlook.com',
        '11 99404-4979',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #38)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('edsonviana74@outlook.com')) OR LOWER(nome) = LOWER('Edson Jose Viana'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Orlando (#4969)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4969' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Orlando',
      '2026-10-18'::DATE,
      '2026-11-05'::DATE,
      55815.15,
      'pos_venda',
      '#4969',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4969
• Consultor Original: Maria
• Data Abertura Legada: 2026-07-27 16:40:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-27'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Maria Valeria Martins Pupo Ferreira (ID Legado: #1891)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '9899720460' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Maria Valeria Martins Pupo Ferreira') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Maria Valeria Martins Pupo Ferreira',
        NULL,
        '98 9972-0460',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1891)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Maria Valeria Martins Pupo Ferreira'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Fortaleza (#4930)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4930' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Fortaleza',
      '2026-10-19'::DATE,
      '2026-11-01'::DATE,
      2136,
      'pos_venda',
      '#4930',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4930
• Consultor Original: Guto
• Data Abertura Legada: 2026-07-14 19:20:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-07-14'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Istambul (#4975)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4975' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Istambul',
      '2026-12-26'::DATE,
      '2027-01-02'::DATE,
      65577.65,
      'pos_venda',
      '#4975',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4975
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-01 10:51:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Operadora
  - CIAS AÉREAS - Assento/bagagem
================================================',
      '2026-08-01'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Istambul (#5047)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5047' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Istambul',
      '2026-12-26'::DATE,
      '2027-01-02'::DATE,
      13609.16,
      'pos_venda',
      '#5047',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5047
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-30 17:45:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-08-30'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Regina Claudia Cardoso (ID Legado: #2144)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('reginaclaudia27@hotmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999262836' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Regina Claudia Cardoso') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Regina Claudia Cardoso',
        'reginaclaudia27@hotmail.com',
        '11 99926-2836',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2144)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('reginaclaudia27@hotmail.com')) OR LOWER(nome) = LOWER('Regina Claudia Cardoso'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Montevideo (#4955)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4955' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Montevideo',
      '2026-10-20'::DATE,
      '2026-10-26'::DATE,
      14445.9,
      'pos_venda',
      '#4955',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4955
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-23 12:58:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-23'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Monica Maria Puliti Segal Grinbaum (ID Legado: #2131)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('monicampuliti@terra.com.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11996027419' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Monica Maria Puliti Segal Grinbaum') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Monica Maria Puliti Segal Grinbaum',
        'monicampuliti@terra.com.br',
        '11 99602-7419',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2131)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('monicampuliti@terra.com.br')) OR LOWER(nome) = LOWER('Monica Maria Puliti Segal Grinbaum'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Roma (#4890)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4890' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-10-25'::DATE,
      '2026-11-01'::DATE,
      15887.92,
      'pos_venda',
      '#4890',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4890
• Consultor Original: Guto
• Data Abertura Legada: 2026-06-23 15:42:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiros
================================================',
      '2026-06-23'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Pedro Paulo Marques Lentino (ID Legado: #1454)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999454804' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Pedro Paulo Marques Lentino') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Pedro Paulo Marques Lentino',
        NULL,
        '11 99945-4804',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1454)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Pedro Paulo Marques Lentino'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Gramado (#5037)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5037' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Gramado',
      '2026-10-26'::DATE,
      '2026-10-31'::DATE,
      20506.73,
      'pos_venda',
      '#5037',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5037
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-08-28 13:47:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-08-28'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Rafael Antonio Gavioli Sartorelli (ID Legado: #656)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('rafaelsartorelli@yahoo.com.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11984854915' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Rafael Antonio Gavioli Sartorelli') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Rafael Antonio Gavioli Sartorelli',
        'rafaelsartorelli@yahoo.com.br',
        '11 98485-4915',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #656)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('rafaelsartorelli@yahoo.com.br')) OR LOWER(nome) = LOWER('Rafael Antonio Gavioli Sartorelli'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Maceió (#4927)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4927' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Maceió',
      '2026-10-30'::DATE,
      '2026-11-04'::DATE,
      540,
      'pos_venda',
      '#4927',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4927
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-14 17:40:00
• Serviços Contratados:
  - CIAS AÉREAS - Emissão Com Pontos
================================================',
      '2026-07-14'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Miami (#4902)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4902' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Miami',
      '2026-11-03'::DATE,
      '2026-11-11'::DATE,
      19998.98,
      'pos_venda',
      '#4902',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4902
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-06-30 23:58:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Executiva
================================================',
      '2026-06-30'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Miami (#5000)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5000' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Miami',
      '2026-11-19'::DATE,
      '2026-11-26'::DATE,
      27852.53,
      'pos_venda',
      '#5000',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5000
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-12 11:17:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Executiva
================================================',
      '2026-08-12'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Salvador (#4735)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4735' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Salvador',
      '2026-12-05'::DATE,
      '2026-12-12'::DATE,
      600,
      'pos_venda',
      '#4735',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4735
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-04-09 15:51:00
• Serviços Contratados:
  - CIAS AÉREAS - Emissão Com Pontos
================================================',
      '2026-04-09'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Paris (#4847)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4847' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Paris',
      '2027-01-05'::DATE,
      '2027-01-19'::DATE,
      149041.88,
      'pos_venda',
      '#4847',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4847
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-06-07 17:38:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Executiva
  - AGAXTUR - Aéreo Facial Executiva
================================================',
      '2026-06-07'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Madri (#4950)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4950' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Madri',
      '2027-04-22'::DATE,
      '2027-05-04'::DATE,
      49952.04,
      'pos_venda',
      '#4950',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4950
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-22 14:50:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Executiva
================================================',
      '2026-07-22'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Roma (#4610)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4610' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-09-12'::DATE,
      '2026-09-25'::DATE,
      61438.36,
      'pre_embarque',
      '#4610',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4610
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-02-22 18:05:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Executiva
================================================',
      '2026-02-22'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Suely Moreira Marques Correia (ID Legado: #2149)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  -- (Sem telefone numérico)

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Suely Moreira Marques Correia') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Suely Moreira Marques Correia',
        NULL,
        '',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2149)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Suely Moreira Marques Correia'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Gramado (#4970)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4970' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Gramado',
      '2026-10-30'::DATE,
      '2026-11-04'::DATE,
      8000,
      'pos_venda',
      '#4970',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4970
• Consultor Original: Malta
• Data Abertura Legada: 2026-07-27 17:50:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-27'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Roberto Ferrazeane Mola (ID Legado: #2156)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('roberto.mola@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '13996159111' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Roberto Ferrazeane Mola') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Roberto Ferrazeane Mola',
        'roberto.mola@gmail.com',
        '13 996159111',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2156)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('roberto.mola@gmail.com')) OR LOWER(nome) = LOWER('Roberto Ferrazeane Mola'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4997)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4997' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2026-11-01'::DATE,
      '2026-11-23'::DATE,
      20137.36,
      'pos_venda',
      '#4997',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4997
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-11 13:58:00
• Canal/Atendimento: Patrocínios Redes Sociais
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Costa
================================================',
      '2026-08-11'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Elis Verri (ID Legado: #2077)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('elisverri@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11967827909' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Elis Verri') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Elis Verri',
        'elisverri@gmail.com',
        '11 967827909',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2077)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('elisverri@gmail.com')) OR LOWER(nome) = LOWER('Elis Verri'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Viena (#4647)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4647' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Viena',
      '2026-11-04'::DATE,
      '2026-11-15'::DATE,
      36392.03,
      'pos_venda',
      '#4647',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4647
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-03-09 22:35:00
• Serviços Contratados:
  - AGAXTUR - Circuitos
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-03-09'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Cristiano Fraleone (ID Legado: #2143)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11939034374' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Cristiano Fraleone') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Cristiano Fraleone',
        NULL,
        '11 939034374',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2143)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Cristiano Fraleone'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Roma (#4948)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4948' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-11-12'::DATE,
      '2026-11-19'::DATE,
      27702.98,
      'pos_venda',
      '#4948',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4948
• Consultor Original: Maria
• Data Abertura Legada: 2026-07-21 21:15:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-21'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Eliciene Lucca (ID Legado: #1453)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11993886475' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Eliciene Lucca') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Eliciene Lucca',
        NULL,
        '11 993886475',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1453)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Eliciene Lucca'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Lisboa (#4978)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4978' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Lisboa',
      '2026-11-15'::DATE,
      '2026-11-25'::DATE,
      23458.7,
      'pos_venda',
      '#4978',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4978
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-08-02 19:20:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-08-02'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Silvia Maria Gomes Pires (ID Legado: #1260)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('silmapires@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '1199430399' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Silvia Maria Gomes Pires') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Silvia Maria Gomes Pires',
        'silmapires@gmail.com',
        '11 9943-0399',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1260)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('silmapires@gmail.com')) OR LOWER(nome) = LOWER('Silvia Maria Gomes Pires'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Londres (#4780)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4780' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Londres',
      '2026-11-19'::DATE,
      '2026-12-02'::DATE,
      35178.58,
      'pos_venda',
      '#4780',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4780
• Consultor Original: Guto
• Data Abertura Legada: 2026-04-27 18:15:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Circuitos
  - AGAXTUR - Seguro Viagem
================================================',
      '2026-04-27'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Islândia (#4968)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4968' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Islândia',
      '2026-11-20'::DATE,
      '2026-11-27'::DATE,
      5065.66,
      'pos_venda',
      '#4968',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4968
• Consultor Original: Guto
• Data Abertura Legada: 2026-07-27 16:20:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-27'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Londres (#4925)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4925' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Londres',
      '2026-11-27'::DATE,
      '2026-12-01'::DATE,
      12536.44,
      'pos_venda',
      '#4925',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4925
• Consultor Original: Guto
• Data Abertura Legada: 2026-07-11 15:49:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Hotel
================================================',
      '2026-07-11'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Renato Sandreschi Sartorelli (ID Legado: #931)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('natosar@terra.com.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999330111' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Renato Sandreschi Sartorelli') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Renato Sandreschi Sartorelli',
        'natosar@terra.com.br',
        '11 99933-0111',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #931)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('natosar@terra.com.br')) OR LOWER(nome) = LOWER('Renato Sandreschi Sartorelli'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Miami (#5001)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5001' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Miami',
      '2026-11-19'::DATE,
      '2026-11-26'::DATE,
      25681.55,
      'pos_venda',
      '#5001',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5001
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-12 11:29:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Executiva
================================================',
      '2026-08-12'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Athos Paulo Tadeu Pacchini (ID Legado: #1730)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11992429784' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Athos Paulo Tadeu Pacchini') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Athos Paulo Tadeu Pacchini',
        NULL,
        '11 99242-9784',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1730)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Athos Paulo Tadeu Pacchini'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4999)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4999' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2026-11-20'::DATE,
      '2026-11-22'::DATE,
      10453.1,
      'pos_venda',
      '#4999',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4999
• Consultor Original: Maria
• Data Abertura Legada: 2026-08-11 16:54:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-11'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Renato Logiudice (ID Legado: #2159)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11995588692' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Renato Logiudice') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Renato Logiudice',
        NULL,
        '11 99558-8692',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2159)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Renato Logiudice'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#5009)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5009' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2026-11-20'::DATE,
      '2026-11-23'::DATE,
      8293.4,
      'pos_venda',
      '#5009',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5009
• Consultor Original: Maria
• Data Abertura Legada: 2026-08-17 13:18:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-17'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Sayonara Brito (ID Legado: #1546)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('sayonarabrito228@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999446642' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Sayonara Brito') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Sayonara Brito',
        'sayonarabrito228@gmail.com',
        '11 99944-6642',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1546)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('sayonarabrito228@gmail.com')) OR LOWER(nome) = LOWER('Sayonara Brito'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: João Pessoa (#5035)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5035' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'João Pessoa',
      '2026-11-26'::DATE,
      '2026-12-01'::DATE,
      9440.53,
      'pos_venda',
      '#5035',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5035
• Consultor Original: Maria
• Data Abertura Legada: 2026-08-28 13:35:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-08-28'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Andre Carvalho Haddad (ID Legado: #1921)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('thabadra@yahoo.com.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11971475777' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Andre Carvalho Haddad') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Andre Carvalho Haddad',
        'thabadra@yahoo.com.br',
        '11 97147-5777',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1921)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('thabadra@yahoo.com.br')) OR LOWER(nome) = LOWER('Andre Carvalho Haddad'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4996)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4996' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2026-11-29'::DATE,
      '2026-12-04'::DATE,
      21193.2,
      'pos_venda',
      '#4996',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4996
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-11 13:49:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-11'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Santos (#4859)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4859' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2027-01-02'::DATE,
      '2027-01-09'::DATE,
      36680,
      'pos_venda',
      '#4859',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4859
• Consultor Original: Guto
• Data Abertura Legada: 2026-06-10 13:04:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-06-10'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Andrea Vinche Badra Pavani (ID Legado: #2157)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('andreabadra@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11995970192' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Andrea Vinche Badra Pavani') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Andrea Vinche Badra Pavani',
        'andreabadra@gmail.com',
        '11 995970192',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2157)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('andreabadra@gmail.com')) OR LOWER(nome) = LOWER('Andrea Vinche Badra Pavani'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4998)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4998' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2026-11-29'::DATE,
      '2026-12-04'::DATE,
      11180.6,
      'pos_venda',
      '#4998',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4998
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-11 14:13:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-11'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Antonio Angelo Badra (ID Legado: #2158)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11941736606' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Antonio Angelo Badra') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Antonio Angelo Badra',
        NULL,
        '11 941736606',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2158)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Antonio Angelo Badra'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#5006)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5006' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2026-11-29'::DATE,
      '2026-12-03'::DATE,
      7564.6,
      'pos_venda',
      '#5006',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5006
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-13 13:34:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-13'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Maria Do Carmo Vinche Badra (ID Legado: #2164)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('thabadra@yahoo.com.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11941736606' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Maria Do Carmo Vinche Badra') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Maria Do Carmo Vinche Badra',
        'thabadra@yahoo.com.br',
        '11 94173-6606',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2164)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('thabadra@yahoo.com.br')) OR LOWER(nome) = LOWER('Maria Do Carmo Vinche Badra'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#5023)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5023' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2026-11-29'::DATE,
      '2026-12-04'::DATE,
      7360.6,
      'pos_venda',
      '#5023',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5023
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-23 15:56:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-23'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Talita Vinche Badra (ID Legado: #2165)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('talitavbadra@hotmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11974716536' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Talita Vinche Badra') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Talita Vinche Badra',
        'talitavbadra@hotmail.com',
        '11 974716536',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2165)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('talitavbadra@hotmail.com')) OR LOWER(nome) = LOWER('Talita Vinche Badra'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#5024)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5024' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2026-11-29'::DATE,
      '2026-12-04'::DATE,
      9840.32,
      'pos_venda',
      '#5024',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5024
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-23 16:00:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-23'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Roberto Gonzalez (ID Legado: #2141)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('gonzalez.pericias@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11982121001' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Roberto Gonzalez') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Roberto Gonzalez',
        'gonzalez.pericias@gmail.com',
        '11 98212-1001',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2141)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('gonzalez.pericias@gmail.com')) OR LOWER(nome) = LOWER('Roberto Gonzalez'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4940)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4940' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2026-12-05'::DATE,
      '2026-12-13'::DATE,
      23694,
      'pos_venda',
      '#4940',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4940
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-17 17:00:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-07-17'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Silvia Regina Della Torre (ID Legado: #519)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11994314015' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Silvia Regina Della Torre') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Silvia Regina Della Torre',
        NULL,
        '11 99431-4015',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #519)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Silvia Regina Della Torre'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Orlando (#4989)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4989' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Orlando',
      '2026-12-14'::DATE,
      '2027-01-04'::DATE,
      8433.76,
      'pos_venda',
      '#4989',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4989
• Consultor Original: Malta
• Data Abertura Legada: 2026-08-07 17:32:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-08-07'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Luciana Galleote Cartocci (ID Legado: #2069)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11997155709' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Luciana Galleote Cartocci') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Luciana Galleote Cartocci',
        NULL,
        '11 997155709',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2069)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Luciana Galleote Cartocci'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Doha (#4592)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4592' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Doha',
      '2026-12-17'::DATE,
      '2026-12-24'::DATE,
      110341.2,
      'pos_venda',
      '#4592',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4592
• Consultor Original: Cadu
• Data Abertura Legada: 2026-02-12 16:46:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
  - AGAXTUR - Cruzeiro Msc
  - AGAXTUR - Cruzeiro Msc
  - AGAXTUR - Cruzeiro Msc
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-02-12'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Simone Alves MagalhÃes Nunes (ID Legado: #2120)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('si_professora@icloud.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11989283349' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Simone Alves MagalhÃes Nunes') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Simone Alves MagalhÃes Nunes',
        'si_professora@icloud.com',
        '11 98928-3349',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2120)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('si_professora@icloud.com')) OR LOWER(nome) = LOWER('Simone Alves MagalhÃes Nunes'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Genebra (#4845)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4845' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Genebra',
      '2026-12-17'::DATE,
      '2026-12-30'::DATE,
      38129.89,
      'pos_venda',
      '#4845',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4845
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-06-05 15:14:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-06-05'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Cleusa Aparecida Petzold (ID Legado: #561)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11974909099' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Cleusa Aparecida Petzold') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Cleusa Aparecida Petzold',
        NULL,
        '11 97490-9099',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #561)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Cleusa Aparecida Petzold'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Genebra (#4885)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4885' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Genebra',
      '2026-12-17'::DATE,
      '2027-01-05'::DATE,
      45699.96,
      'pos_venda',
      '#4885',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4885
• Consultor Original: Maria
• Data Abertura Legada: 2026-06-23 14:56:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Executiva
================================================',
      '2026-06-23'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Antonio Petsold (ID Legado: #1371)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11942429099' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Antonio Petsold') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Antonio Petsold',
        NULL,
        '11 94242-9099',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1371)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Antonio Petsold'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Genebra (#4886)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4886' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Genebra',
      '2026-12-17'::DATE,
      '2027-01-05'::DATE,
      20741.81,
      'pos_venda',
      '#4886',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4886
• Consultor Original: Maria
• Data Abertura Legada: 2026-06-23 14:59:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-06-23'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Jorge Eduardo De Oliveira (ID Legado: #2132)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11981526816' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Jorge Eduardo De Oliveira') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Jorge Eduardo De Oliveira',
        NULL,
        '11 98152-6816',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2132)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Jorge Eduardo De Oliveira'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4994)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4994' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2026-12-18'::DATE,
      '2026-12-21'::DATE,
      15282,
      'pos_venda',
      '#4994',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4994
• Consultor Original: Maria
• Data Abertura Legada: 2026-08-10 18:32:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-10'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Mauro Bispo Dos Santos (ID Legado: #2161)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11913981020' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Mauro Bispo Dos Santos') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Mauro Bispo Dos Santos',
        NULL,
        '11 91398-1020',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2161)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Mauro Bispo Dos Santos'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Londrina (#5030)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5030' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Londrina',
      '2026-12-18'::DATE,
      '2026-12-19'::DATE,
      2137.7,
      'pos_venda',
      '#5030',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5030
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-26 16:35:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-08-26'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Miami (#5016)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5016' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Miami',
      '2026-12-20'::DATE,
      '2027-01-11'::DATE,
      18823.72,
      'pos_venda',
      '#5016',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5016
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-18 17:31:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-08-18'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Renata Campato (ID Legado: #294)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11981818900' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Renata Campato') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Renata Campato',
        NULL,
        '11 98181-8900',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #294)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Renata Campato'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: São Paulo (#4714)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4714' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'São Paulo',
      '2026-12-19'::DATE,
      '2027-01-08'::DATE,
      8710.6,
      'pos_venda',
      '#4714',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4714
• Consultor Original: Malta
• Data Abertura Legada: 2026-04-02 18:02:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-04-02'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Cristiana Ferraz Lopes (ID Legado: #2125)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('cristianaferrazlopes@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '21987335726' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Cristiana Ferraz Lopes') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Cristiana Ferraz Lopes',
        'cristianaferrazlopes@gmail.com',
        '21 98733-5726',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2125)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('cristianaferrazlopes@gmail.com')) OR LOWER(nome) = LOWER('Cristiana Ferraz Lopes'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Nova Iorque (#4863)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4863' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Nova Iorque',
      '2026-12-21'::DATE,
      '2027-01-08'::DATE,
      39683.92,
      'pos_venda',
      '#4863',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4863
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-06-11 16:19:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-06-11'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Nova Iorque (#4906)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4906' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Nova Iorque',
      '2026-12-22'::DATE,
      '2027-01-04'::DATE,
      28257.21,
      'pos_venda',
      '#4906',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4906
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-02 12:06:00
• Serviços Contratados:
  - AGAXTUR - Hotel
================================================',
      '2026-07-02'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Orlando (#4864)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4864' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Orlando',
      '2026-12-28'::DATE,
      '2026-12-28'::DATE,
      0,
      'pos_venda',
      '#4864',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4864
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-06-11 16:21:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
• Observação Operacional: Data de retorno não constava na planilha original (assumida mesma data de embarque).
================================================',
      '2026-06-11'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Orlando (#5017)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5017' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Orlando',
      '2026-12-28'::DATE,
      '2027-01-04'::DATE,
      19124.64,
      'pos_venda',
      '#5017',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5017
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-18 17:38:00
• Serviços Contratados:
  - AGAXTUR - Hotel
================================================',
      '2026-08-18'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Joyce De Carvalho Soares (ID Legado: #1228)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11953914422' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Joyce De Carvalho Soares') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Joyce De Carvalho Soares',
        NULL,
        '11 95391-4422',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1228)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Joyce De Carvalho Soares'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4807)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4807' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2026-12-26'::DATE,
      '2026-12-29'::DATE,
      11928,
      'pos_venda',
      '#4807',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4807
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-05-20 13:48:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-05-20'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Ana Lucia Maranho (ID Legado: #1127)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11991556860' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Ana Lucia Maranho') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Ana Lucia Maranho',
        NULL,
        '11 99155-6860',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1127)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Ana Lucia Maranho'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Nova Iorque (#4870)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4870' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Nova Iorque',
      '2026-12-26'::DATE,
      '2027-01-16'::DATE,
      28587.94,
      'pos_venda',
      '#4870',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4870
• Consultor Original: Maria
• Data Abertura Legada: 2026-06-22 16:56:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Operadora
================================================',
      '2026-06-22'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Jose Vinicius Vieira Dos Santos (ID Legado: #2086)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('jvinicius.vsantos@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '44999911412' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Jose Vinicius Vieira Dos Santos') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Jose Vinicius Vieira Dos Santos',
        'jvinicius.vsantos@gmail.com',
        '44 999911412',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2086)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('jvinicius.vsantos@gmail.com')) OR LOWER(nome) = LOWER('Jose Vinicius Vieira Dos Santos'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4700)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4700' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2026-12-27'::DATE,
      '2027-01-03'::DATE,
      17599.96,
      'pos_venda',
      '#4700',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4700
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-03-29 15:02:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Costa
================================================',
      '2026-03-29'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Carlos Roberto Camargo (ID Legado: #1796)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11984291338' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Carlos Roberto Camargo') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Carlos Roberto Camargo',
        NULL,
        '11 98429-1338',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1796) | Telefones adicionais: 11 98419-1907',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Carlos Roberto Camargo'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Honolulu (#4808)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4808' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Honolulu',
      '2026-12-27'::DATE,
      '2027-01-03'::DATE,
      10713.48,
      'pos_venda',
      '#4808',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4808
• Consultor Original: Maria
• Data Abertura Legada: 2026-05-20 18:26:00
• Serviços Contratados:
  - AGAXTUR - Hotel
================================================',
      '2026-05-20'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Honolulu (#4937)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4937' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Honolulu',
      '2026-12-30'::DATE,
      '2026-12-30'::DATE,
      11526.66,
      'pos_venda',
      '#4937',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4937
• Consultor Original: Maria
• Data Abertura Legada: 2026-07-16 19:37:00
• Serviços Contratados:
  - AGAXTUR - Serviços
• Observação Operacional: Data de retorno não constava na planilha original (assumida mesma data de embarque).
================================================',
      '2026-07-16'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Julio Cesar De Macedo (ID Legado: #577)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('alinesperius@hotmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11996191605' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Julio Cesar De Macedo') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Julio Cesar De Macedo',
        'alinesperius@hotmail.com',
        '11 99619-1605',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #577) | Telefones adicionais: 11 99239-4440',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('alinesperius@hotmail.com')) OR LOWER(nome) = LOWER('Julio Cesar De Macedo'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Roma (#4924)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4924' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-12-27'::DATE,
      '2027-01-12'::DATE,
      30389.54,
      'pos_venda',
      '#4924',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4924
• Consultor Original: Guto
• Data Abertura Legada: 2026-07-11 15:38:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-07-11'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Roma (#4928)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4928' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-12-27'::DATE,
      '2027-01-12'::DATE,
      3410,
      'pos_venda',
      '#4928',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4928
• Consultor Original: Guto
• Data Abertura Legada: 2026-07-14 19:12:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-07-14'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Karina Iotti Angi Barreto (ID Legado: #2027)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('karinaiottiangibarreto@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11971211350' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Karina Iotti Angi Barreto') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Karina Iotti Angi Barreto',
        'karinaiottiangibarreto@gmail.com',
        '11 97121-1350',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2027)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('karinaiottiangibarreto@gmail.com')) OR LOWER(nome) = LOWER('Karina Iotti Angi Barreto'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Orlando com Miami (#4977)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4977' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Orlando com Miami',
      '2026-12-27'::DATE,
      '2027-01-11'::DATE,
      37556.24,
      'pos_venda',
      '#4977',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4977
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-02 19:21:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-08-02'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Bruno Amaro Alves De Almeida (ID Legado: #2105)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('brunoamaro.sp@hotmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11981120010' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Bruno Amaro Alves De Almeida') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Bruno Amaro Alves De Almeida',
        'brunoamaro.sp@hotmail.com',
        '11 981120010',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2105)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('brunoamaro.sp@hotmail.com')) OR LOWER(nome) = LOWER('Bruno Amaro Alves De Almeida'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Punta Cana (#4775)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4775' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Punta Cana',
      '2026-12-28'::DATE,
      '2027-01-04'::DATE,
      22551.7,
      'pos_venda',
      '#4775',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4775
• Consultor Original: Cadu
• Data Abertura Legada: 2026-04-24 12:25:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Costa
================================================',
      '2026-04-24'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Barbara Hossni Espinhel De Jesus (ID Legado: #1126)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11996885227' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Barbara Hossni Espinhel De Jesus') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Barbara Hossni Espinhel De Jesus',
        NULL,
        '11 99688-5227',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1126)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Barbara Hossni Espinhel De Jesus'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Orlando (#4815)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4815' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Orlando',
      '2026-12-28'::DATE,
      '2027-01-08'::DATE,
      56075.56,
      'pos_venda',
      '#4815',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4815
• Consultor Original: Cadu
• Data Abertura Legada: 2026-05-21 14:48:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
  - AGAXTUR - Serviços
================================================',
      '2026-05-21'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Elba Maria Goncalo Do Amaral (ID Legado: #2138)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11981152032' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Elba Maria Goncalo Do Amaral') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Elba Maria Goncalo Do Amaral',
        NULL,
        '11 981152032',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2138)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Elba Maria Goncalo Do Amaral'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Mendoza (#4932)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4932' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Mendoza',
      '2026-12-31'::DATE,
      '2027-01-05'::DATE,
      11539.44,
      'pos_venda',
      '#4932',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4932
• Consultor Original: Guto
• Data Abertura Legada: 2026-07-16 15:52:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-16'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Eduardo Olzon Zambelli (ID Legado: #2057)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11983838102' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Eduardo Olzon Zambelli') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Eduardo Olzon Zambelli',
        NULL,
        '11 983838102',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2057)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Eduardo Olzon Zambelli'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4532)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4532' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2027-01-02'::DATE,
      '2027-01-09'::DATE,
      17628,
      'pos_venda',
      '#4532',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4532
• Consultor Original: Maria
• Data Abertura Legada: 2026-01-15 19:36:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-01-15'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Jaqueline De Alcantara Ribeiro (ID Legado: #2098)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('jaquelinedealcantara@icloud.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11940202173' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Jaqueline De Alcantara Ribeiro') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Jaqueline De Alcantara Ribeiro',
        'jaquelinedealcantara@icloud.com',
        '11 940202173',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2098)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('jaquelinedealcantara@icloud.com')) OR LOWER(nome) = LOWER('Jaqueline De Alcantara Ribeiro'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4758)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4758' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2027-01-06'::DATE,
      '2027-01-14'::DATE,
      13686,
      'pos_venda',
      '#4758',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4758
• Consultor Original: Cadu
• Data Abertura Legada: 2026-04-18 14:38:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-04-18'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Walter Takashi Yoshii (ID Legado: #1754)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('walter_yoshii@hotmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999467785' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Walter Takashi Yoshii') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Walter Takashi Yoshii',
        'walter_yoshii@hotmail.com',
        '11 99946-7785',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1754)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('walter_yoshii@hotmail.com')) OR LOWER(nome) = LOWER('Walter Takashi Yoshii'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Paris (#4696)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4696' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Paris',
      '2027-01-10'::DATE,
      '2027-01-17'::DATE,
      48640.2,
      'pos_venda',
      '#4696',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4696
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-03-25 22:11:00
• Serviços Contratados:
  - AGAXTUR - Hotel
================================================',
      '2026-03-25'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Fernanda Dos Santos Ikier (ID Legado: #2116)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999444624' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Fernanda Dos Santos Ikier') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Fernanda Dos Santos Ikier',
        NULL,
        '11 99944-4624',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2116)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Fernanda Dos Santos Ikier'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Lisboa (#4822)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4822' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Lisboa',
      '2027-01-15'::DATE,
      '2027-01-31'::DATE,
      74231.03,
      'pos_venda',
      '#4822',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4822
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-05-24 17:44:00
• Canal/Atendimento: Patrocínios Redes Sociais
• Serviços Contratados:
  - AGAXTUR - Hotel
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-05-24'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Barcelona (#4903)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4903' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Barcelona',
      '2027-01-28'::DATE,
      '2027-02-01'::DATE,
      5054.99,
      'pos_venda',
      '#4903',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4903
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-01 10:57:00
• Serviços Contratados:
  - AGAXTUR - Hotel
================================================',
      '2026-07-01'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Thais Santana Da Silva Candido (ID Legado: #2117)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('thais.santanads3@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11982507398' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Thais Santana Da Silva Candido') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Thais Santana Da Silva Candido',
        'thais.santanads3@gmail.com',
        '11 982507398',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2117)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('thais.santanads3@gmail.com')) OR LOWER(nome) = LOWER('Thais Santana Da Silva Candido'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4829)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4829' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2027-01-23'::DATE,
      '2027-01-26'::DATE,
      9614,
      'pos_venda',
      '#4829',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4829
• Consultor Original: Malta
• Data Abertura Legada: 2026-05-28 15:23:00
• Canal/Atendimento: RD Station Agaxtur
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-05-28'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Silvio Franco Nakaura (ID Legado: #2148)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11985405440' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Silvio Franco Nakaura') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Silvio Franco Nakaura',
        NULL,
        '11 98540-5440',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2148)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Silvio Franco Nakaura'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4967)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4967' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2027-01-23'::DATE,
      '2027-01-30'::DATE,
      23160.72,
      'pos_venda',
      '#4967',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4967
• Consultor Original: Maria
• Data Abertura Legada: 2026-07-26 18:25:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-07-26'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Glaucia Ferreira Heleno (ID Legado: #2168)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('gheleno@hotmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '19178825281' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Glaucia Ferreira Heleno') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Glaucia Ferreira Heleno',
        'gheleno@hotmail.com',
        '1 9178825281',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2168)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('gheleno@hotmail.com')) OR LOWER(nome) = LOWER('Glaucia Ferreira Heleno'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#5041)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5041' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2027-01-23'::DATE,
      '2027-01-30'::DATE,
      20136.72,
      'pos_venda',
      '#5041',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5041
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-28 14:40:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-28'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Ana Maria Orfei Abe (ID Legado: #1843)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('ana.abe@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11989114348' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Ana Maria Orfei Abe') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Ana Maria Orfei Abe',
        'ana.abe@gmail.com',
        '11 98911-4348',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1843)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('ana.abe@gmail.com')) OR LOWER(nome) = LOWER('Ana Maria Orfei Abe'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Buenos Aires (#4745)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4745' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Buenos Aires',
      '2027-01-27'::DATE,
      '2027-02-07'::DATE,
      4985.2,
      'pos_venda',
      '#4745',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4745
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-04-12 12:37:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-04-12'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Ushuaia (#4225)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4225' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Ushuaia',
      '2027-01-28'::DATE,
      '2027-02-06'::DATE,
      115947.77,
      'pos_venda',
      '#4225',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4225
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2025-09-17 13:47:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiros
================================================',
      '2025-09-17'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Taciana Abdalla (ID Legado: #2170)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('tacianaabdalla@hotmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11995350507' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Taciana Abdalla') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Taciana Abdalla',
        'tacianaabdalla@hotmail.com',
        '11 995350507',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2170)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('tacianaabdalla@hotmail.com')) OR LOWER(nome) = LOWER('Taciana Abdalla'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Miami (#5049)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5049' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Miami',
      '2027-02-04'::DATE,
      '2027-02-16'::DATE,
      45424.46,
      'pos_venda',
      '#5049',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5049
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-08-31 21:31:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-08-31'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Kelly Cristina Arima (ID Legado: #2090)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11996867474' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Kelly Cristina Arima') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Kelly Cristina Arima',
        NULL,
        '11 996867474',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2090)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Kelly Cristina Arima'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Tóquio (#4723)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4723' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Tóquio',
      '2027-02-06'::DATE,
      '2027-02-24'::DATE,
      63689.22,
      'pos_venda',
      '#4723',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4723
• Consultor Original: Maria
• Data Abertura Legada: 2026-04-08 14:29:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-04-08'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Cibelle Lacerda (ID Legado: #1382)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('cibelle_lacerda@yahoo.com.br') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11961736116' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Cibelle Lacerda') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Cibelle Lacerda',
        'cibelle_lacerda@yahoo.com.br',
        '11 96173-6116',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1382)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('cibelle_lacerda@yahoo.com.br')) OR LOWER(nome) = LOWER('Cibelle Lacerda'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Bari (#5025)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5025' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Bari',
      '2027-02-06'::DATE,
      '2027-02-13'::DATE,
      8972,
      'pos_venda',
      '#5025',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5025
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-23 16:11:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-23'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Artur Der Agopian (ID Legado: #2155)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11996412125' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Artur Der Agopian') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Artur Der Agopian',
        NULL,
        '11 99641-2125',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2155)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Artur Der Agopian'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4995)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4995' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2027-02-07'::DATE,
      '2027-02-14'::DATE,
      34344.2,
      'pos_venda',
      '#4995',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4995
• Consultor Original: Maria
• Data Abertura Legada: 2026-08-10 18:39:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-10'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Alceia Mendes (ID Legado: #2169)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('alceiamendes@hotmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11967782607' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Alceia Mendes') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Alceia Mendes',
        'alceiamendes@hotmail.com',
        '11 967782607',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2169)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('alceiamendes@hotmail.com')) OR LOWER(nome) = LOWER('Alceia Mendes'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#5046)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5046' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2027-02-07'::DATE,
      '2027-02-14'::DATE,
      10914.3,
      'pos_venda',
      '#5046',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5046
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-08-30 17:38:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Costa
================================================',
      '2026-08-30'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Ana Carolina Alves Pais Da Silva (ID Legado: #2096)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('carolina.silvaaps@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11980610775' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Ana Carolina Alves Pais Da Silva') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Ana Carolina Alves Pais Da Silva',
        'carolina.silvaaps@gmail.com',
        '11 98061-0775',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2096)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('carolina.silvaaps@gmail.com')) OR LOWER(nome) = LOWER('Ana Carolina Alves Pais Da Silva'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#4747)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4747' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2027-02-28'::DATE,
      '2027-03-07'::DATE,
      13887,
      'pos_venda',
      '#4747',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4747
• Consultor Original: Malta
• Data Abertura Legada: 2026-04-13 19:32:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-04-13'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Tânia Abib De Paula (ID Legado: #2160)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11982840580' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Tânia Abib De Paula') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Tânia Abib De Paula',
        NULL,
        '11 982840580',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2160)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Tânia Abib De Paula'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Santos (#5013)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5013' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Santos',
      '2027-03-07'::DATE,
      '2027-03-18'::DATE,
      13387.28,
      'pos_venda',
      '#5013',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5013
• Consultor Original: Maria
• Data Abertura Legada: 2026-08-18 11:30:00
• Canal/Atendimento: E-mail Marketing
• Serviços Contratados:
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-08-18'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Patricia Francisca Da Silva (ID Legado: #2166)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('patriciafs3512@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11930030968' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Patricia Francisca Da Silva') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Patricia Francisca Da Silva',
        'patriciafs3512@gmail.com',
        '11 93003-0968',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2166)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('patriciafs3512@gmail.com')) OR LOWER(nome) = LOWER('Patricia Francisca Da Silva'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Roma (#5032)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5032' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2027-03-12'::DATE,
      '2027-03-25'::DATE,
      14262.3,
      'pos_venda',
      '#5032',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5032
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-27 18:34:00
• Serviços Contratados:
  - AGAXTUR - Circuitos
================================================',
      '2026-08-27'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Roma (#5036)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5036' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2027-03-12'::DATE,
      '2027-03-25'::DATE,
      14262.3,
      'pos_venda',
      '#5036',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5036
• Consultor Original: Maria
• Data Abertura Legada: 2026-08-28 13:39:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-08-28'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Luiz Claudio Mori (ID Legado: #1859)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('luizinhohirata@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11947710157' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Luiz Claudio Mori') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Luiz Claudio Mori',
        'luizinhohirata@gmail.com',
        '11 94771-0157',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1859)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('luizinhohirata@gmail.com')) OR LOWER(nome) = LOWER('Luiz Claudio Mori'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Tóquio (#5022)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5022' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Tóquio',
      '2027-03-20'::DATE,
      '2027-04-16'::DATE,
      57283.44,
      'pos_venda',
      '#5022',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5022
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-22 19:01:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Executiva
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-08-22'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Tóquio (#5031)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5031' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Tóquio',
      '2027-04-12'::DATE,
      '2027-04-12'::DATE,
      10603.07,
      'pos_venda',
      '#5031',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5031
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-26 19:02:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
• Observação Operacional: Data de retorno não constava na planilha original (assumida mesma data de embarque).
================================================',
      '2026-08-26'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: São Paulo (#5043)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5043' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'São Paulo',
      '2027-04-12'::DATE,
      '2027-04-16'::DATE,
      10603.07,
      'pos_venda',
      '#5043',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5043
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-28 15:10:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-08-28'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Nelly Maria De Morais Silveira (ID Legado: #2133)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11971289278' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Nelly Maria De Morais Silveira') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Nelly Maria De Morais Silveira',
        NULL,
        '11 971289278',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2133)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Nelly Maria De Morais Silveira'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Lisboa (#4897)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4897' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Lisboa',
      '2027-03-28'::DATE,
      '2027-04-06'::DATE,
      30500,
      'pos_venda',
      '#4897',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4897
• Consultor Original: Guto
• Data Abertura Legada: 2026-06-28 16:45:00
• Canal/Atendimento: RD Station Agaxtur
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-06-28'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Regiane Lopes (ID Legado: #941)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999465688' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Regiane Lopes') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Regiane Lopes',
        NULL,
        '11 99946-5688',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #941)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Regiane Lopes'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Istambul (#5007)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5007' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Istambul',
      '2027-04-10'::DATE,
      '2027-04-21'::DATE,
      40746.62,
      'pos_venda',
      '#5007',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5007
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-13 13:39:00
• Serviços Contratados:
  - AGAXTUR - Circuitos
================================================',
      '2026-08-13'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Istambul (#5048)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5048' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Istambul',
      '2027-04-10'::DATE,
      '2027-04-17'::DATE,
      2097.2,
      'pos_venda',
      '#5048',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5048
• Consultor Original: Guto
• Data Abertura Legada: 2026-08-31 15:43:00
• Serviços Contratados:
  - AGAXTUR - Serviços
================================================',
      '2026-08-31'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Lucia Martins Oliveira Franco (ID Legado: #1724)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11983315718' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Lucia Martins Oliveira Franco') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Lucia Martins Oliveira Franco',
        NULL,
        '11 98331-5718',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1724)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Lucia Martins Oliveira Franco'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Istambul (#4708)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4708' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Istambul',
      '2027-07-11'::DATE,
      '2027-07-21'::DATE,
      7073.96,
      'pos_venda',
      '#4708',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4708
• Consultor Original: Cadu
• Data Abertura Legada: 2026-04-02 13:53:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiros
================================================',
      '2026-04-02'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Monica Sirianni Zanchetta (ID Legado: #1725)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '1198331571' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Monica Sirianni Zanchetta') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Monica Sirianni Zanchetta',
        NULL,
        '11 9833-1571',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1725)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Monica Sirianni Zanchetta'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Istambul (#4709)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4709' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Istambul',
      '2027-07-11'::DATE,
      '2027-07-21'::DATE,
      5291.22,
      'pos_venda',
      '#4709',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4709
• Consultor Original: Cadu
• Data Abertura Legada: 2026-04-02 13:55:00
• Serviços Contratados:
  - AGAXTUR - Cruzeiros
================================================',
      '2026-04-02'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Antonio Kerges De Carvalho (ID Legado: #2062)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11982822573' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Antonio Kerges De Carvalho') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Antonio Kerges De Carvalho',
        NULL,
        '11 98282-2573',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2062)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Antonio Kerges De Carvalho'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Istambul (#4551)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4551' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Istambul',
      '2026-08-27'::DATE,
      '2026-09-14'::DATE,
      64715.51,
      'pre_embarque',
      '#4551',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4551
• Consultor Original: Maria
• Data Abertura Legada: 2026-01-26 12:56:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
  - AGAXTUR - Cruzeiro Msc
================================================',
      '2026-01-26'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Rodrigo Scatulin Gerritsen Plaggert (ID Legado: #2145)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('rsgp77@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11947769740' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Rodrigo Scatulin Gerritsen Plaggert') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Rodrigo Scatulin Gerritsen Plaggert',
        'rsgp77@gmail.com',
        '11 94776-9740',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2145)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('rsgp77@gmail.com')) OR LOWER(nome) = LOWER('Rodrigo Scatulin Gerritsen Plaggert'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Munique (#4980)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4980' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Munique',
      '2026-09-07'::DATE,
      '2026-09-14'::DATE,
      11583.59,
      'pre_embarque',
      '#4980',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4980
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-02 19:39:00
• Serviços Contratados:
  - AGAXTUR - Hotel
  - AGAXTUR - Seguro Viagem
• Contato Pré-Embarque Legado: check-in ok!
• Contato Pós-Viagem Legado: Realizado
================================================',
      '2026-08-02'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Munique (#4956)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4956' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Munique',
      '2026-09-05'::DATE,
      '2026-09-17'::DATE,
      11832.49,
      'pre_embarque',
      '#4956',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4956
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-23 16:21:00
• Serviços Contratados:
  - AGAXTUR - Hotel
================================================',
      '2026-07-23'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Munique (#4957)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4957' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Munique',
      '2026-09-04'::DATE,
      '2026-09-17'::DATE,
      20477.78,
      'pre_embarque',
      '#4957',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4957
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-23 16:27:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-07-23'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Maria Cristina Ricardi (ID Legado: #1664)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11981807890' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Maria Cristina Ricardi') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Maria Cristina Ricardi',
        NULL,
        '11 98180-7890',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1664)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Maria Cristina Ricardi'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Zurique (#4732)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4732' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Zurique',
      '2026-08-31'::DATE,
      '2026-09-15'::DATE,
      9375.28,
      'pre_embarque',
      '#4732',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4732
• Consultor Original: Cadu
• Data Abertura Legada: 2026-04-09 15:31:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-04-09'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Derci Martins Barbosa (ID Legado: #1132)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11996994107' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Derci Martins Barbosa') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Derci Martins Barbosa',
        NULL,
        '11 99699-4107',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1132)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Derci Martins Barbosa'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Milão (#4910)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4910' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Milão',
      '2026-08-14'::DATE,
      '2026-09-15'::DATE,
      35581.86,
      'pre_embarque',
      '#4910',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4910
• Consultor Original: Malta
• Data Abertura Legada: 2026-07-03 17:04:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-07-03'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Milão (#4941)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4941' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Milão',
      '2026-08-15'::DATE,
      '2026-09-15'::DATE,
      73481.6,
      'pre_embarque',
      '#4941',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4941
• Consultor Original: Malta
• Data Abertura Legada: 2026-07-18 17:36:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-18'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Milão (#4951)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4951' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Milão',
      '2026-08-14'::DATE,
      '2026-09-15'::DATE,
      6998.68,
      'pre_embarque',
      '#4951',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4951
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-22 15:04:00
• Serviços Contratados:
  - AGAXTUR - Seguro Viagem
  - AGAXTUR - Serviços
• Contato Pré-Embarque Legado: apenas seguro e trem
• Contato Pós-Viagem Legado: Realizado
================================================',
      '2026-07-22'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Danielle Nascimento Cusato (ID Legado: #1848)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '111198112906' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Danielle Nascimento Cusato') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Danielle Nascimento Cusato',
        NULL,
        '11 1198112906',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1848)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Danielle Nascimento Cusato'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Paris (#4895)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4895' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Paris',
      '2026-09-04'::DATE,
      '2026-09-16'::DATE,
      111279.92,
      'pre_embarque',
      '#4895',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4895
• Consultor Original: Maria
• Data Abertura Legada: 2026-06-25 22:15:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-06-25'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Julia Mitiko Sartori (ID Legado: #2147)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999719483' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Julia Mitiko Sartori') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Julia Mitiko Sartori',
        NULL,
        '11 999719483',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2147)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Julia Mitiko Sartori'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Praia do Forte (#4963)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4963' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Praia do Forte',
      '2026-09-11'::DATE,
      '2026-09-16'::DATE,
      18786.7,
      'pre_embarque',
      '#4963',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4963
• Consultor Original: Maria
• Data Abertura Legada: 2026-07-24 17:02:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-07-24'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Maria Isabel Oliveira Arruda (ID Legado: #1590)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999733773' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Maria Isabel Oliveira Arruda') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Maria Isabel Oliveira Arruda',
        NULL,
        '11 99973-3773',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1590)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Maria Isabel Oliveira Arruda'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Vitória (#4810)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4810' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Vitória',
      '2026-09-11'::DATE,
      '2026-09-19'::DATE,
      849.96,
      'pre_embarque',
      '#4810',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4810
• Consultor Original: Maria
• Data Abertura Legada: 2026-05-20 18:44:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-05-20'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Rosiana Maria De Souza Silva (ID Legado: #2154)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11957268931' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Rosiana Maria De Souza Silva') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Rosiana Maria De Souza Silva',
        NULL,
        '11 957268931',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2154)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Rosiana Maria De Souza Silva'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Istambul (#4993)
  v_consultor_id := '7ebd4f09-cc00-4926-bd34-4434142eeaa6';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4993' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Istambul',
      '2026-09-04'::DATE,
      '2026-09-20'::DATE,
      89510.64,
      'pre_embarque',
      '#4993',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4993
• Consultor Original: Maria
• Data Abertura Legada: 2026-08-10 18:26:00
• Serviços Contratados:
  - AGAXTUR - Pacotes
================================================',
      '2026-08-10'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Selma Affonso (ID Legado: #1265)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11960820601' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Selma Affonso') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Selma Affonso',
        NULL,
        '11 96082-0601',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1265)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Selma Affonso'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Lisboa (#4451)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4451' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Lisboa',
      '2026-09-01'::DATE,
      '2026-09-25'::DATE,
      11202.96,
      'pre_embarque',
      '#4451',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4451
• Consultor Original: Guto
• Data Abertura Legada: 2025-12-05 18:50:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2025-12-05'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Lisboa (#4512)
  v_consultor_id := '62c00399-2d8a-462e-ac2e-47cac998e3dd';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4512' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Lisboa',
      '2026-09-01'::DATE,
      '2026-09-25'::DATE,
      6325,
      'pre_embarque',
      '#4512',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4512
• Consultor Original: Guto
• Data Abertura Legada: 2026-01-05 15:43:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-01-05'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Suely Briguenti Ferraz (ID Legado: #2142)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('subriguenti@gmail.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11999367425' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Suely Briguenti Ferraz') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Suely Briguenti Ferraz',
        'subriguenti@gmail.com',
        '11 99936-7425',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #2142)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('subriguenti@gmail.com')) OR LOWER(nome) = LOWER('Suely Briguenti Ferraz'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Roma (#4944)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4944' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-08-29'::DATE,
      '2026-09-26'::DATE,
      21693.1,
      'pre_embarque',
      '#4944',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4944
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-20 15:37:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
• Contato Pré-Embarque Legado: check-in ok!
• Contato Pós-Viagem Legado: Realizado
================================================',
      '2026-07-20'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Roma (#5002)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#5002' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Roma',
      '2026-08-29'::DATE,
      '2026-09-27'::DATE,
      3923.5,
      'pre_embarque',
      '#5002',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #5002
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-08-12 15:30:00
• Serviços Contratados:
  - AGAXTUR - Seguro Viagem
• Contato Pós-Viagem Legado: Realizado
================================================',
      '2026-08-12'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Ibere Valeri Navas (ID Legado: #1262)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11989541897' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Ibere Valeri Navas') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Ibere Valeri Navas',
        NULL,
        '11 98954-1897',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1262)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Ibere Valeri Navas'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Boston (#4876)
  v_consultor_id := 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4876' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Boston',
      '2026-09-02'::DATE,
      '2026-09-29'::DATE,
      27045.84,
      'pre_embarque',
      '#4876',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4876
• Consultor Original: Rafael Sousa
• Data Abertura Legada: 2026-06-22 19:44:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
• Contato Pós-Viagem Legado: Realizado
================================================',
      '2026-06-22'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Santos Lopez Garcia (ID Legado: #637)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11975774340' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Santos Lopez Garcia') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Santos Lopez Garcia',
        NULL,
        '11 97577-4340',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #637)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Santos Lopez Garcia'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Madri (#4589)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4589' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Madri',
      '2026-04-09'::DATE,
      '2026-10-13'::DATE,
      13837.93,
      'pre_embarque',
      '#4589',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4589
• Consultor Original: Cadu
• Data Abertura Legada: 2026-02-12 16:14:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
  - AGAXTUR - Serviços
================================================',
      '2026-02-12'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Aurea Zila Pires De Almeida Andrade (ID Legado: #618)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  -- (Sem e-mail informado)

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11964860986' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Aurea Zila Pires De Almeida Andrade') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Aurea Zila Pires De Almeida Andrade',
        NULL,
        '11 96486-0986',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #618)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (LOWER(nome) = LOWER('Aurea Zila Pires De Almeida Andrade'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Sydney (#4693)
  v_consultor_id := 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4693' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Sydney',
      '2026-09-12'::DATE,
      '2026-10-27'::DATE,
      14780.14,
      'pre_embarque',
      '#4693',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4693
• Consultor Original: Cadu
• Data Abertura Legada: 2026-03-25 17:14:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
================================================',
      '2026-03-25'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- ============================================================================
  -- Cliente: Valeria Mariano De Souza (ID Legado: #1676)
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER('valeriamarian0@yahoo.com') LIMIT 1;

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\D', '', 'g') = '11934077593' LIMIT 1;
  END IF;

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER('Valeria Mariano De Souza') LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        'Valeria Mariano De Souza',
        'valeriamarian0@yahoo.com',
        '11 93407-7593',
        'Importado da migração #MIGRACAO_MALTA_20260909 (Ref Legada: #1676)',
        ARRAY['MIGRACAO_MALTA_20260909']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE ((email IS NOT NULL AND LOWER(email) = LOWER('valeriamarian0@yahoo.com')) OR LOWER(nome) = LOWER('Valeria Mariano De Souza'))
      LIMIT 1;
    END;
  END IF;

  -- Viagem: Lisboa (#4964)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4964' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Lisboa',
      '2026-08-18'::DATE,
      '2026-11-12'::DATE,
      2983.16,
      'pre_embarque',
      '#4964',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4964
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-24 17:23:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Econômica
• Contato Pré-Embarque Legado: check-in ok!
• Contato Pós-Viagem Legado: Realizado
================================================',
      '2026-07-24'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  -- Viagem: Lisboa (#4953)
  v_consultor_id := 'c99688ad-31f2-4724-b170-e43888ac9de8';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = '#4953' 
      AND origem = 'MIGRACAO_MALTA_20260909'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      'Lisboa',
      '2026-08-18'::DATE,
      '2026-11-17'::DATE,
      15562.62,
      'pre_embarque',
      '#4953',
      '=== [MIGRACAO_MALTA_20260909] HISTÓRICO DE MIGRAÇÃO ===
• Venda Original Legada: #4953
• Consultor Original: Marinna Morena
• Data Abertura Legada: 2026-07-22 17:33:00
• Serviços Contratados:
  - AGAXTUR - Aéreo Facial Executiva
• Contato Pré-Embarque Legado: check-in ok!
• Contato Pós-Viagem Legado: Realizado
================================================',
      '2026-07-22'::DATE,
      'MIGRACAO_MALTA_20260909',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;

  RAISE NOTICE 'Migração concluída com sucesso! Viagens inseridas: %, Novos clientes inseridos: %', v_count_viagens, v_count_clientes;
END $$;

COMMIT;
