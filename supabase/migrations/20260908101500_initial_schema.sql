-- Migration: Initial Schema for Droppr
-- Conforms to docs/PRD.md §6 and AGENTS.md §6 (Strict RLS per user_id)

-- Enable pgcrypto for UUID generation if not yet enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUMS & DOMAINS
-- ============================================================================

-- Project lifecycle status: matches PRD §4.5 and DESIGN.md status colors
CREATE TYPE public.project_status AS ENUM (
  'not_started',    -- Belum Mulai
  'in_progress',    -- Sedang Dikerjakan
  'waiting',        -- Menunggu TGE / Snapshot
  'ready_to_claim', -- Siap Klaim (fase reward)
  'completed'       -- Selesai / Klaim Selesai
);

-- Task frequency types
CREATE TYPE public.task_type AS ENUM (
  'one_time',
  'daily',
  'weekly',
  'custom'
);

-- Task status
CREATE TYPE public.task_status AS ENUM (
  'pending',
  'done',
  'skipped'
);

-- ============================================================================
-- 2. HELPER FUNCTIONS
-- ============================================================================

-- Automatically maintain updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. TABLES DEFINITION
-- ============================================================================

-- 3.1 Folders: Category grouping for projects
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_folders_user_id ON public.folders(user_id);

CREATE TRIGGER set_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.2 Projects: Main entity for airdrop tracking
-- If a folder is deleted, the project is retained with folder_id set to NULL
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  chain TEXT,
  status public.project_status NOT NULL DEFAULT 'not_started',
  logo_url TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  guide_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_folder_id ON public.projects(folder_id);
CREATE INDEX idx_projects_status ON public.projects(status);

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.3 Tasks: Tasks per project
-- Deleting a project cascades and deletes all associated tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type public.task_type NOT NULL DEFAULT 'one_time',
  due_date TIMESTAMPTZ,
  recurrence_rule TEXT, -- iCalendar RRULE format or custom expression string
  status public.task_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_status ON public.tasks(status);

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.4 Wallets: Public wallet addresses saved by the user
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  chain TEXT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_wallets_address ON public.wallets(address);

CREATE TRIGGER set_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.5 Project Wallets: Many-to-many relationship between projects and wallets
-- Deleting either project or wallet cascades to the join table
CREATE TABLE public.project_wallets (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, wallet_id)
);

CREATE INDEX idx_project_wallets_wallet_id ON public.project_wallets(wallet_id);

-- 3.6 Accounts: Non-sensitive platform usernames/emails per project
-- SECURITY RULE: Strictly prohibited from holding password, seed_phrase, or private_key columns
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  username_email TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_project_id ON public.accounts(project_id);

CREATE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.7 Reminders: Scheduled notifications linked to a project or specific task
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL, -- e.g. 'once', 'daily', 'weekly'
  channel TEXT[] NOT NULL DEFAULT ARRAY['in_app'::TEXT], -- e.g. array of 'in_app', 'email', 'push'
  next_trigger_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_reminders_target CHECK (project_id IS NOT NULL OR task_id IS NOT NULL)
);

CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_next_trigger ON public.reminders(next_trigger_at);

CREATE TRIGGER set_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.8 Claims: Historical record of token rewards claimed
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token_amount NUMERIC,
  token_symbol TEXT,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  estimated_value NUMERIC, -- USD/IDR estimate at claim time
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claims_project_id ON public.claims(project_id);

CREATE TRIGGER set_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.9 Notification Log: Auditable record of sent notifications
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent'
);

CREATE INDEX idx_notification_log_user_id ON public.notification_log(user_id);
CREATE INDEX idx_notification_log_reminder_id ON public.notification_log(reminder_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Mandatory RLS enforcement on all tables without exception
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 4.1 Folders RLS (Direct user_id ownership)
-- ----------------------------------------------------------------------------
-- User can only inspect, create, modify, and delete their own folders.
CREATE POLICY "folders_select_own" ON public.folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "folders_insert_own" ON public.folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "folders_update_own" ON public.folders
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "folders_delete_own" ON public.folders
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4.2 Projects RLS (Direct user_id ownership)
-- ----------------------------------------------------------------------------
-- User can only inspect, create, modify, and delete their own projects.
-- When attaching a folder_id on insert/update, ensures the folder also belongs to the user.
CREATE POLICY "projects_select_own" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (folder_id IS NULL OR EXISTS (
      SELECT 1 FROM public.folders f WHERE f.id = folder_id AND f.user_id = auth.uid()
    ))
  );

CREATE POLICY "projects_update_own" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    (folder_id IS NULL OR EXISTS (
      SELECT 1 FROM public.folders f WHERE f.id = folder_id AND f.user_id = auth.uid()
    ))
  );

CREATE POLICY "projects_delete_own" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4.3 Tasks RLS (Indirect ownership via parent project)
-- ----------------------------------------------------------------------------
-- Tasks table does not duplicate user_id to prevent data anomalies. Ownership
-- is verified by joining to public.projects.user_id = auth.uid().
CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id AND p.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id AND p.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 4.4 Wallets RLS (Direct user_id ownership)
-- ----------------------------------------------------------------------------
-- User can only inspect, create, modify, and delete their own saved wallet addresses.
CREATE POLICY "wallets_select_own" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wallets_insert_own" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wallets_update_own" ON public.wallets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wallets_delete_own" ON public.wallets
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4.5 Project Wallets RLS (Join table verification)
-- ----------------------------------------------------------------------------
-- A user can view or remove associations only if the referenced project belongs to them.
-- On insert, both the target project AND the target wallet MUST belong to auth.uid()
-- to prevent associating another user's wallet with one's project.
CREATE POLICY "project_wallets_select_own" ON public.project_wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_wallets.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "project_wallets_insert_own" ON public.project_wallets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_wallets.project_id AND p.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM public.wallets w
      WHERE w.id = project_wallets.wallet_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "project_wallets_delete_own" ON public.project_wallets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_wallets.project_id AND p.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 4.6 Accounts RLS (Indirect ownership via parent project)
-- ----------------------------------------------------------------------------
-- Accounts are per-project non-sensitive credentials. Access is guarded by checking
-- that the parent project belongs to auth.uid().
CREATE POLICY "accounts_select_own" ON public.accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = accounts.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "accounts_insert_own" ON public.accounts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = accounts.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "accounts_update_own" ON public.accounts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = accounts.project_id AND p.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = accounts.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "accounts_delete_own" ON public.accounts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = accounts.project_id AND p.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 4.7 Reminders RLS (Direct user_id ownership + Target verification)
-- ----------------------------------------------------------------------------
-- Reminders store user_id directly to streamline cron queries and edge functions.
-- On insert/update, ensures any referenced project/task also belongs to auth.uid().
CREATE POLICY "reminders_select_own" ON public.reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reminders_insert_own" ON public.reminders
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      project_id IS NULL OR EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()
      )
    )
    AND (
      task_id IS NULL OR EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.projects p ON p.id = t.project_id
        WHERE t.id = task_id AND p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "reminders_update_own" ON public.reminders
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      project_id IS NULL OR EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()
      )
    )
    AND (
      task_id IS NULL OR EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.projects p ON p.id = t.project_id
        WHERE t.id = task_id AND p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "reminders_delete_own" ON public.reminders
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4.8 Claims RLS (Indirect ownership via parent project)
-- ----------------------------------------------------------------------------
-- Claims track rewards per project. Ownership is verified via public.projects.user_id = auth.uid().
CREATE POLICY "claims_select_own" ON public.claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = claims.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "claims_insert_own" ON public.claims
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = claims.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "claims_update_own" ON public.claims
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = claims.project_id AND p.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = claims.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "claims_delete_own" ON public.claims
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = claims.project_id AND p.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 4.9 Notification Log RLS (Direct user_id ownership)
-- ----------------------------------------------------------------------------
-- Notification log is owned directly by user_id.
-- User can read and manage their notification history.
CREATE POLICY "notification_log_select_own" ON public.notification_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notification_log_insert_own" ON public.notification_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_log_update_own" ON public.notification_log
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_log_delete_own" ON public.notification_log
  FOR DELETE USING (auth.uid() = user_id);
