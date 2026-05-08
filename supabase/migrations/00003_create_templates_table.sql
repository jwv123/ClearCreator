-- 00003_create_templates_table.sql
-- Pre-built design templates

CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  canvas_json JSONB NOT NULL,
  canvas_width INTEGER NOT NULL DEFAULT 1080,
  canvas_height INTEGER NOT NULL DEFAULT 1080,
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  thumbnail_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_templates_category ON public.templates(category);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates"
  ON public.templates FOR SELECT
  USING (true);

-- Only admins can modify templates (manage via Supabase dashboard or service role)
CREATE POLICY "Only admins can modify templates"
  ON public.templates FOR ALL
  USING (false) WITH CHECK (false);