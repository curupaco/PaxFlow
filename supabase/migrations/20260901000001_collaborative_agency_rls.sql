-- ============================================================
-- PaxFlow Migration: Modelo Agência Colaborativa (RLS Aberto para Leitura)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabela: clientes
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de clientes para o próprio consultor ou admin" ON public.clientes;
DROP POLICY IF EXISTS "Inserir clientes para o próprio consultor ou admin" ON public.clientes;
DROP POLICY IF EXISTS "Atualizar clientes para o próprio consultor ou admin" ON public.clientes;
DROP POLICY IF EXISTS "Excluir clientes apenas por admins" ON public.clientes;

CREATE POLICY "Leitura de clientes para todos autenticados" 
ON public.clientes FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Inserir clientes para autenticados" 
ON public.clientes FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Atualizar clientes para autenticados" 
ON public.clientes FOR UPDATE TO authenticated 
USING (true);

CREATE POLICY "Excluir clientes apenas por admins" 
ON public.clientes FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ------------------------------------------------------------
-- 2. Tabela: orcamentos
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de orçamentos para o próprio consultor ou admin" ON public.orcamentos;
DROP POLICY IF EXISTS "Inserir orçamentos para o próprio consultor ou admin" ON public.orcamentos;
DROP POLICY IF EXISTS "Atualizar orçamentos para o próprio consultor ou admin" ON public.orcamentos;
DROP POLICY IF EXISTS "Excluir orçamentos apenas por admins" ON public.orcamentos;

CREATE POLICY "Leitura de orçamentos para todos autenticados" 
ON public.orcamentos FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Inserir orçamentos para autenticados" 
ON public.orcamentos FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Atualizar orçamentos para autenticados" 
ON public.orcamentos FOR UPDATE TO authenticated 
USING (true);

CREATE POLICY "Excluir orçamentos apenas por admins" 
ON public.orcamentos FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ------------------------------------------------------------
-- 3. Tabela: viagens
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de viagens para o próprio consultor ou admin" ON public.viagens;
DROP POLICY IF EXISTS "Inserir viagens para o próprio consultor ou admin" ON public.viagens;
DROP POLICY IF EXISTS "Atualizar viagens para o próprio consultor ou admin" ON public.viagens;
DROP POLICY IF EXISTS "Excluir viagens apenas por admins" ON public.viagens;

CREATE POLICY "Leitura de viagens para todos autenticados" 
ON public.viagens FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Inserir viagens para autenticados" 
ON public.viagens FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Atualizar viagens para autenticados" 
ON public.viagens FOR UPDATE TO authenticated 
USING (true);

CREATE POLICY "Excluir viagens apenas por admins" 
ON public.viagens FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ------------------------------------------------------------
-- 4. Tabela: produtos_viagem
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de produtos para consultor da viagem ou admin" ON public.produtos_viagem;
DROP POLICY IF EXISTS "Inserir produtos de viagens permitidas" ON public.produtos_viagem;
DROP POLICY IF EXISTS "Atualizar produtos de viagens permitidas" ON public.produtos_viagem;
DROP POLICY IF EXISTS "Excluir produtos de viagens permitidas" ON public.produtos_viagem;

CREATE POLICY "Leitura de produtos de viagem para todos autenticados" 
ON public.produtos_viagem FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Inserir produtos de viagem para autenticados" 
ON public.produtos_viagem FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Atualizar produtos de viagem para autenticados" 
ON public.produtos_viagem FOR UPDATE TO authenticated 
USING (true);

CREATE POLICY "Excluir produtos de viagem para autenticados" 
ON public.produtos_viagem FOR DELETE TO authenticated 
USING (true);

-- ------------------------------------------------------------
-- 5. Tabela: reembolsos
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de reembolsos para consultor solicitante/viagem ou admin" ON public.reembolsos;
DROP POLICY IF EXISTS "Inserir reembolsos para o próprio consultor ou admin" ON public.reembolsos;
DROP POLICY IF EXISTS "Atualizar reembolsos para o próprio consultor ou admin" ON public.reembolsos;
DROP POLICY IF EXISTS "Excluir reembolsos apenas por admins" ON public.reembolsos;

CREATE POLICY "Leitura de reembolsos para todos autenticados" 
ON public.reembolsos FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Inserir reembolsos para autenticados" 
ON public.reembolsos FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Atualizar reembolsos para autenticados" 
ON public.reembolsos FOR UPDATE TO authenticated 
USING (true);

CREATE POLICY "Excluir reembolsos apenas por admins" 
ON public.reembolsos FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ------------------------------------------------------------
-- 6. Tabela: lembretes
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de lembretes para o próprio consultor, criador ou admin" ON public.lembretes;
DROP POLICY IF EXISTS "Inserir lembretes para o próprio consultor, criador ou admin" ON public.lembretes;
DROP POLICY IF EXISTS "Atualizar lembretes para o próprio consultor, criador ou admin" ON public.lembretes;
DROP POLICY IF EXISTS "Excluir lembretes para o próprio consultor, criador ou admin" ON public.lembretes;

CREATE POLICY "Leitura de lembretes para todos autenticados" 
ON public.lembretes FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Inserir lembretes para autenticados" 
ON public.lembretes FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Atualizar lembretes para autenticados" 
ON public.lembretes FOR UPDATE TO authenticated 
USING (true);

CREATE POLICY "Excluir lembretes para autenticados" 
ON public.lembretes FOR DELETE TO authenticated 
USING (true);
