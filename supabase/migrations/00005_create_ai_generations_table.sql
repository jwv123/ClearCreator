-- 00005_create_ai_generations_table.sql
-- Logs AI generation requests for audit and analytics

CREATE TABLE public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('full_design', 'element_modify')),
  model_used TEXT NOT NULL,
  raw_response JSONB,
  parsed_result JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'streaming', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_generations_owner_id ON public.ai_generations(owner_id);
CREATE INDEX idx_ai_generations_project_id ON public.ai_generations(project_id);

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generations"
  ON public.ai_generations FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create generations"
  ON public.ai_generations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);