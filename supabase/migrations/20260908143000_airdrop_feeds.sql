-- ============================================================================
-- Migration: 20260908143000_airdrop_feeds.sql
-- Table: public.airdrop_feeds (Curated New Airdrop Posts from Telegram Channels)
-- RLS Policy: STRICT isolation by auth.uid() = user_id
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.airdrop_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('dutacryptoairdrop', 'airdropfind', 'general')),
  channel_name TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('testnet', 'airdrop', 'waitlist', 'retro', 'general')),
  cost TEXT,
  tasks JSONB DEFAULT '[]'::jsonb,
  source_url TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  is_imported BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index per user and source url to prevent duplicates on sync
CREATE UNIQUE INDEX IF NOT EXISTS idx_airdrop_feeds_user_source ON public.airdrop_feeds(user_id, source_url);
CREATE INDEX IF NOT EXISTS idx_airdrop_feeds_user_created ON public.airdrop_feeds(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_airdrop_feeds_expires_at ON public.airdrop_feeds(expires_at);

-- Trigger for auto updated_at
CREATE TRIGGER set_airdrop_feeds_updated_at
  BEFORE UPDATE ON public.airdrop_feeds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.airdrop_feeds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own airdrop feeds"
  ON public.airdrop_feeds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own airdrop feeds"
  ON public.airdrop_feeds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own airdrop feeds"
  ON public.airdrop_feeds FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own airdrop feeds"
  ON public.airdrop_feeds FOR DELETE
  USING (auth.uid() = user_id);
