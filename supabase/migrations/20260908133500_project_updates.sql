-- ============================================================================
-- Migration: 20260908133500_project_updates.sql
-- Table: public.project_updates (Chronological thread updates: tasks, news, milestones)
-- RLS Policy: STRICT isolation by auth.uid() = user_id
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task', 'news', 'milestone')),
  title TEXT NOT NULL,
  content TEXT,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'info')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON public.project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_user_id ON public.project_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_created_at ON public.project_updates(created_at DESC);

-- Trigger for auto updated_at
CREATE TRIGGER set_project_updates_updated_at
  BEFORE UPDATE ON public.project_updates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own project updates"
  ON public.project_updates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project updates"
  ON public.project_updates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project updates"
  ON public.project_updates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own project updates"
  ON public.project_updates FOR DELETE
  USING (auth.uid() = user_id);
