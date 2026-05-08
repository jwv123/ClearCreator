-- 00004_create_uploads_table.sql
-- User-uploaded image metadata (files stored in Supabase Storage)

CREATE TABLE public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_uploads_owner_id ON public.uploads(owner_id);
CREATE INDEX idx_uploads_project_id ON public.uploads(project_id);

ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own uploads"
  ON public.uploads FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create uploads"
  ON public.uploads FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own uploads"
  ON public.uploads FOR DELETE
  USING (auth.uid() = owner_id);