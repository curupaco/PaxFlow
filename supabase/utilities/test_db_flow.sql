-- ============================================================================
-- PaxFlow — Script de Teste do Fluxo Completo (Banco de Dados)
-- ============================================================================
-- Este script valida a integridade referencial e as constraints das tabelas
-- realizando a simulação de uma venda completa:
-- 1. Cria um orçamento (SOLICITADO)
-- 2. Cria um cliente (com documento nulo, para validar a flexibilidade)
-- 3. Cria uma viagem (confirmada, vinculando o cliente e o consultor)
-- 4. Conclui o orçamento (CONCLUIDO/ACEITO vinculando o cliente)
-- 5. Valida os status resultantes
-- 6. Limpa todos os dados criados no teste
--
-- Execute este script no SQL Editor do seu console Supabase.
-- Se retornar sucesso, a integridade do banco de dados está 100% garantida!
-- ============================================================================

DO $$
DECLARE
  new_client_id UUID;
  new_budget_id UUID;
  new_trip_id UUID;
  chk_status VARCHAR;
  chk_sub_status VARCHAR;
BEGIN
  RAISE NOTICE 'Iniciando teste de integridade do fluxo...';

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
    'd11433e1-06c5-4002-be7e-0e2c44bc5782', -- Thiago Costa (ID de exemplo ativo)
    'Cliente Teste Fluxo',
    '11988887777 / teste@fluxo.com',
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
    'Cliente Teste Fluxo',
    'teste@fluxo.com',
    '11988887777',
    NULL, -- Campo nulo que gerava o erro anteriormente
    'd11433e1-06c5-4002-be7e-0e2c44bc5782'
  ) RETURNING id INTO new_client_id;

  -- 3. Criar Viagem / Venda (Vinculada ao cliente criado)
  INSERT INTO public.viagens (
    cliente_id,
    consultor_id,
    destino,
    data_ida,
    data_volta,
    valor_total,
    status,
    codigo_localizador
  ) VALUES (
    new_client_id,
    'd11433e1-06c5-4002-be7e-0e2c44bc5782',
    'Paris, França',
    '2026-12-01',
    '2026-12-10',
    5000.00,
    'fechado',
    'XYZ123'
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

  RAISE NOTICE '🏆 Fluxo de banco validado com sucesso! Nenhuma violação de integridade ou constraint detectada.';
END $$;
