-- ============================================================================
-- Migration: 20260912000000_shared_feeds_and_waitlists.sql
-- Purpose: Convert public Telegram signals (airdrop_feeds & pending waitlists)
--          into a Shared Global Pool across all authenticated users with Supabase Realtime,
--          while keeping user's private joined waitlist accounts and project links 100% isolated.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PUBLIC AIRDROP FEEDS (Global Catalog)
-- ----------------------------------------------------------------------------

-- Remove per-user duplicate index if exists
DROP INDEX IF EXISTS public.idx_airdrop_feeds_user_source;

-- Deduplicate any existing duplicate feeds keeping the latest created record
DELETE FROM public.airdrop_feeds a
WHERE a.id NOT IN (
  SELECT DISTINCT ON (source_url) id
  FROM public.airdrop_feeds
  ORDER BY source_url, created_at DESC
);

-- Ensure global uniqueness by source_url so one user's sync benefits all users
CREATE UNIQUE INDEX IF NOT EXISTS idx_airdrop_feeds_source_url 
  ON public.airdrop_feeds(source_url);

-- Update RLS policies on public.airdrop_feeds
ALTER TABLE public.airdrop_feeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own airdrop feeds" ON public.airdrop_feeds;
DROP POLICY IF EXISTS "Users can insert own airdrop feeds" ON public.airdrop_feeds;
DROP POLICY IF EXISTS "Users can update own airdrop feeds" ON public.airdrop_feeds;
DROP POLICY IF EXISTS "Users can delete own airdrop feeds" ON public.airdrop_feeds;
DROP POLICY IF EXISTS "Authenticated users can view all airdrop feeds" ON public.airdrop_feeds;
DROP POLICY IF EXISTS "Authenticated users can insert airdrop feeds" ON public.airdrop_feeds;
DROP POLICY IF EXISTS "Authenticated users can update airdrop feeds" ON public.airdrop_feeds;
DROP POLICY IF EXISTS "Authenticated users can delete airdrop feeds" ON public.airdrop_feeds;

-- All logged-in users can read the global catalog of airdrop signals
CREATE POLICY "Authenticated users can view all airdrop feeds"
  ON public.airdrop_feeds FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user (or background service) can sync new feeds
CREATE POLICY "Authenticated users can insert airdrop feeds"
  ON public.airdrop_feeds FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update airdrop feeds"
  ON public.airdrop_feeds FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete airdrop feeds"
  ON public.airdrop_feeds FOR DELETE
  TO authenticated
  USING (true);

-- Add airdrop_feeds to Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'airdrop_feeds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.airdrop_feeds;
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 2. WAITLISTS (Shared Discovery Catalog + Strict Private Joined Records)
-- ----------------------------------------------------------------------------

-- Remove per-user duplicate index
DROP INDEX IF EXISTS public.idx_waitlists_user_source;

-- Deduplicate existing pending waitlist catalog entries
DELETE FROM public.waitlists a
WHERE a.status = 'pending' AND a.id NOT IN (
  SELECT DISTINCT ON (source_url) id
  FROM public.waitlists
  WHERE status = 'pending'
  ORDER BY source_url, created_at DESC
);

-- Catalog waitlists (pending) are globally unique by source_url
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlists_pending_source 
  ON public.waitlists(source_url) 
  WHERE status = 'pending';

-- Joined waitlists are strictly unique per user and source_url
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlists_joined_user_source 
  ON public.waitlists(user_id, source_url) 
  WHERE status = 'joined';

-- Update RLS policies on public.waitlists
ALTER TABLE public.waitlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own waitlists" ON public.waitlists;
DROP POLICY IF EXISTS "Users can insert own waitlists" ON public.waitlists;
DROP POLICY IF EXISTS "Users can update own waitlists" ON public.waitlists;
DROP POLICY IF EXISTS "Users can delete own waitlists" ON public.waitlists;
DROP POLICY IF EXISTS "Users can view pending catalog and own joined waitlists" ON public.waitlists;
DROP POLICY IF EXISTS "Users can insert waitlists" ON public.waitlists;
DROP POLICY IF EXISTS "Users can update waitlists" ON public.waitlists;
DROP POLICY IF EXISTS "Users can delete waitlists" ON public.waitlists;

-- All users can view the shared pending discovery catalog,
-- but each user can ONLY view their own private joined registration details!
CREATE POLICY "Users can view pending catalog and own joined waitlists"
  ON public.waitlists FOR SELECT
  TO authenticated
  USING (status = 'pending' OR auth.uid() = user_id);

CREATE POLICY "Users can insert waitlists"
  ON public.waitlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR status = 'pending');

CREATE POLICY "Users can update waitlists"
  ON public.waitlists FOR UPDATE
  TO authenticated
  USING (status = 'pending' OR auth.uid() = user_id)
  WITH CHECK (status = 'pending' OR auth.uid() = user_id);

CREATE POLICY "Users can delete waitlists"
  ON public.waitlists FOR DELETE
  TO authenticated
  USING (status = 'pending' OR auth.uid() = user_id);

-- Add waitlists to Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'waitlists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.waitlists;
  END IF;
END $$;
