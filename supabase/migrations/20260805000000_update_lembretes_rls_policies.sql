-- Remover políticas antigas
DROP POLICY IF EXISTS "Leitura de lembretes para o próprio consultor ou admin" ON public.lembretes;
DROP POLICY IF EXISTS "Leitura de lembretes para o próprio consultor, criador ou admin" ON public.lembretes;
DROP POLICY IF EXISTS "Inserir lembretes para o próprio consultor ou admin" ON public.lembretes;
DROP POLICY IF EXISTS "Inserir lembretes para o próprio consultor, criador ou admin" ON public.lembretes;
DROP POLICY IF EXISTS "Atualizar lembretes para o próprio consultor ou admin" ON public.lembretes;
DROP POLICY IF EXISTS "Atualizar lembretes para o próprio consultor, criador ou admin" ON public.lembretes;
DROP POLICY IF EXISTS "Excluir lembretes para o próprio consultor ou admin" ON public.lembretes;
DROP POLICY IF EXISTS "Excluir lembretes para o próprio consultor, criador ou admin" ON public.lembretes;

-- Criar novas políticas atualizadas
CREATE POLICY "Leitura de lembretes para o próprio consultor, criador ou admin" 
ON public.lembretes FOR SELECT TO authenticated 
USING (consultor_id = auth.uid() OR criador_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Inserir lembretes para o próprio consultor, criador ou admin" 
ON public.lembretes FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = consultor_id OR auth.uid() = criador_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Atualizar lembretes para o próprio consultor, criador ou admin" 
ON public.lembretes FOR UPDATE TO authenticated 
USING (auth.uid() = consultor_id OR auth.uid() = criador_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Excluir lembretes para o próprio consultor, criador ou admin" 
ON public.lembretes FOR DELETE TO authenticated 
USING (auth.uid() = consultor_id OR auth.uid() = criador_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
