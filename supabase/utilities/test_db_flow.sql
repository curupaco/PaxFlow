-- ============================================================================
-- PaxFlow — Script de Teste de Integridade e Fluxo Completo (Banco de Dados)
-- ============================================================================

DO $$
DECLARE
  v_consultor_id UUID;
  new_client_id UUID;
  new_budget_id UUID;
  new_trip_id UUID;
  chk_status VARCHAR;
  chk_sub_status VARCHAR;
BEGIN
  RAISE NOTICE 'Iniciando teste de integridade do fluxo de banco de dados...';

  -- Obter um consultor ativo da base
  SELECT id INTO v_consultor_id FROM public.profiles WHERE ativo = true LIMIT 1;
  IF v_consultor_id IS NULL THEN
    SELECT id INTO v_consultor_id FROM public.profiles LIMIT 1;
  END IF;

  -- 1. Criar Orçamento (Simulando a inserção inicial)
  INSERT INTO public.orcamentos (
    consultor_id,
    nome_cliente,
    contato,
    destino,
    data_viagem,
    temperatura,
    status
  ) VALUES (
    v_consultor_id,
    'Cliente Teste Integridade',
    '11988887777 / teste@validacao.com',
    'Paris, França',
    '2026-12-01',
    'Normal',
    'SOLICITADO'
  ) RETURNING id INTO new_budget_id;

  -- 2. Cadastrar Cliente (Simulando com documento nulo)
  INSERT INTO public.clientes (
    nome,
    email,
    telefone,
    documento,
    consultor_responsavel_id
  ) VALUES (
    'Cliente Teste Integridade',
    'teste@validacao.com',
    '11988887777',
    NULL,
    v_consultor_id
  ) RETURNING id INTO new_client_id;

  -- 3. Criar Viagem / Venda (Vinculada ao cliente)
  INSERT INTO public.viagens (
    cliente_id,
    consultor_id,
    destino,
    data_ida,
    data_volta,
    data_financeiro,
    valor_total,
    status,
    codigo_localizador
  ) VALUES (
    new_client_id,
    v_consultor_id,
    'Paris, França',
    '2026-12-01',
    '2026-12-10',
    '2026-12-01',
    5000.00,
    'fechado',
    'TEST1234'
  ) RETURNING id INTO new_trip_id;

  -- 4. Fechar / Aceitar Orçamento (Atualizar status e vincular cliente)
  UPDATE public.orcamentos
  SET status = 'CONCLUIDO',
      sub_status = 'ACEITO',
      cliente_id = new_client_id
  WHERE id = new_budget_id;

  -- 5. Validar que os status e vinculações foram gravados corretamente
  SELECT status, sub_status INTO chk_status, chk_sub_status
  FROM public.orcamentos
  WHERE id = new_budget_id;

  IF chk_status != 'CONCLUIDO' OR chk_sub_status != 'ACEITO' THEN
    RAISE EXCEPTION 'Erro de validação: Status do orçamento incorreto pós-conversão!';
  END IF;

  -- 6. Limpeza automática dos registros de teste
  DELETE FROM public.orcamentos WHERE id = new_budget_id;
  DELETE FROM public.viagens WHERE id = new_trip_id;
  DELETE FROM public.clientes WHERE id = new_client_id;

  RAISE NOTICE '🏆 FLUXO E INTEGRIDADE DO BANCO DE DADOS VALIDADOS COM SUCESSO!';
END $$;
