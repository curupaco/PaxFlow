-- ============================================================================
-- PaxFlow — Script de Limpeza de Dados Transacionais (Resiliente)
-- ============================================================================
-- Este script limpa os dados de testes (inbox, clientes, orçamentos, vendas/viagens,
-- cartões de tarefas e logs de auditoria) mantendo as configurações, usuários e colunas do Kanban.
--
-- NOTA: Ele utiliza SQL Dinâmico (EXECUTE) e verificações de existência de tabelas.
-- Se alguma tabela (como 'audit_logs') ainda não tiver sido criada no seu Supabase,
-- o script simplesmente a ignora de forma silenciosa e continua o processo sem erros.
--
-- ATENÇÃO: ESTA OPERAÇÃO É DESTRUTIVA. Faça backup dos dados se necessário.
-- Execute este script no SQL Editor do seu console Supabase.
-- ============================================================================

DO $$
BEGIN
  -- 1. Desativar temporariamente apenas os triggers de usuário (evitando erros com triggers de sistema/chaves estrangeiras)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clientes') THEN
    EXECUTE 'ALTER TABLE public.clientes DISABLE TRIGGER USER';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'viagens') THEN
    EXECUTE 'ALTER TABLE public.viagens DISABLE TRIGGER USER';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reembolsos') THEN
    EXECUTE 'ALTER TABLE public.reembolsos DISABLE TRIGGER USER';
  END IF;

  -- 2. Limpar notificações, comentários e lembretes se existirem
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notificacoes') THEN
    EXECUTE 'DELETE FROM public.notificacoes';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comentarios') THEN
    EXECUTE 'DELETE FROM public.comentarios';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lembretes') THEN
    EXECUTE 'DELETE FROM public.lembretes';
  END IF;

  -- 3. Limpar orçamentos se existir
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orcamentos') THEN
    EXECUTE 'DELETE FROM public.orcamentos';
  END IF;

  -- 4. Limpar reembolsos, produtos de viagem e viagens se existirem
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reembolsos') THEN
    EXECUTE 'DELETE FROM public.reembolsos';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'produtos_viagem') THEN
    EXECUTE 'DELETE FROM public.produtos_viagem';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'viagens') THEN
    EXECUTE 'DELETE FROM public.viagens';
  END IF;

  -- 5. Limpar clientes se existir
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clientes') THEN
    EXECUTE 'DELETE FROM public.clientes';
  END IF;

  -- 6. Limpar cartões do Kanban se existir
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'todo_cards') THEN
    EXECUTE 'DELETE FROM public.todo_cards';
  END IF;

  -- 7. Limpar logs de auditoria se existir
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    EXECUTE 'DELETE FROM public.audit_logs';
  END IF;

  -- 8. Apagar usuários inativos ou com nome 'desconhecido' se a tabela profiles existir
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    EXECUTE 'CREATE TEMP TABLE users_to_delete AS SELECT id FROM public.profiles WHERE ativo = false OR nome ILIKE ''%desconhecido%'' OR nome IN (''User A Test'', ''User B Test'')';
    EXECUTE 'DELETE FROM public.profiles WHERE id IN (SELECT id FROM users_to_delete)';
    EXECUTE 'DELETE FROM auth.users WHERE id IN (SELECT id FROM users_to_delete)';
    EXECUTE 'DROP TABLE users_to_delete';
  END IF;

  -- 9. Reabilitar os triggers de usuário das tabelas
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clientes') THEN
    EXECUTE 'ALTER TABLE public.clientes ENABLE TRIGGER USER';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'viagens') THEN
    EXECUTE 'ALTER TABLE public.viagens ENABLE TRIGGER USER';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reembolsos') THEN
    EXECUTE 'ALTER TABLE public.reembolsos ENABLE TRIGGER USER';
  END IF;
END $$;
