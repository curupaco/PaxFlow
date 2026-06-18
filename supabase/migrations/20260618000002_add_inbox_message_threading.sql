-- Add parent_id and thread_id to support conversation threads
ALTER TABLE public.mensagens_diretas 
ADD COLUMN parent_id UUID REFERENCES public.mensagens_diretas(id) ON DELETE SET NULL,
ADD COLUMN thread_id UUID REFERENCES public.mensagens_diretas(id) ON DELETE SET NULL;

-- Index the new columns for faster queries
CREATE INDEX IF NOT EXISTS idx_mensagens_diretas_parent_id ON public.mensagens_diretas(parent_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_diretas_thread_id ON public.mensagens_diretas(thread_id);
