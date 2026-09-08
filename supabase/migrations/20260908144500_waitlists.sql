-- ============================================================================
-- Migration: 20260908144500_waitlists.sql
-- Table: public.waitlists (Dedicated Tracker for Waitlist Projects - 90 Days Range)
-- RLS Policy: STRICT isolation by auth.uid() = user_id
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.waitlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('dutacryptoairdrop', 'airdropfind', 'manual')),
  source_url TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'joined')),
  registered_account TEXT,
  ref_link TEXT,
  tasks JSONB DEFAULT '[]'::jsonb,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index per user and source url
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlists_user_source ON public.waitlists(user_id, source_url);
CREATE INDEX IF NOT EXISTS idx_waitlists_user_status ON public.waitlists(user_id, status);
CREATE INDEX IF NOT EXISTS idx_waitlists_expires_at ON public.waitlists(expires_at);

-- Trigger for auto updated_at
CREATE TRIGGER set_waitlists_updated_at
  BEFORE UPDATE ON public.waitlists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.waitlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own waitlists"
  ON public.waitlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own waitlists"
  ON public.waitlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own waitlists"
  ON public.waitlists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own waitlists"
  ON public.waitlists FOR DELETE
  USING (auth.uid() = user_id);
