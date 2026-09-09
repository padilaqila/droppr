-- ============================================================================
-- Migration: 20260909220000_user_accounts.sql
-- Table: public.user_accounts (Personal Social Media & Identity Accounts for Multi-Account Farming)
-- RLS Policy: STRICT isolation by auth.uid() = user_id
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'Twitter / X', 'Discord', 'Telegram', 'Email', 'GitHub', 'Google', 'Custom'
  handle TEXT NOT NULL,   -- '@0xPadiel', 'user@gmail.com', 'user#1234'
  label TEXT,             -- 'Akun Utama', 'Tuyul 01', 'Cadangan'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON public.user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_platform ON public.user_accounts(platform);

-- Trigger for auto updated_at
CREATE TRIGGER set_user_accounts_updated_at
  BEFORE UPDATE ON public.user_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own social accounts"
  ON public.user_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social accounts"
  ON public.user_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social accounts"
  ON public.user_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own social accounts"
  ON public.user_accounts FOR DELETE
  USING (auth.uid() = user_id);
