-- ==============================================================================
-- TIP CRM — Database Migration: Persistent User Workspaces & Session Resumption
-- File: supabase/migrations/20261017000000_user_workspaces.sql
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_workspaces (
  user_id VARCHAR(100) PRIMARY KEY,
  last_active_tab VARCHAR(50) NOT NULL DEFAULT 'dashboard',
  selected_record_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  view_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  drafts JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE public.user_workspaces ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own workspace state
DROP POLICY IF EXISTS user_workspaces_select_own ON public.user_workspaces;
CREATE POLICY user_workspaces_select_own ON public.user_workspaces
  FOR SELECT
  USING (
    user_id = auth.uid()::text 
    OR user_id = (SELECT id::text FROM public.users WHERE auth_user_id = auth.uid())
    OR auth.role() = 'service_role'
  );

-- Policy: Users can insert/update their own workspace state
DROP POLICY IF EXISTS user_workspaces_insert_own ON public.user_workspaces;
CREATE POLICY user_workspaces_insert_own ON public.user_workspaces
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text 
    OR user_id = (SELECT id::text FROM public.users WHERE auth_user_id = auth.uid())
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS user_workspaces_update_own ON public.user_workspaces;
CREATE POLICY user_workspaces_update_own ON public.user_workspaces
  FOR UPDATE
  USING (
    user_id = auth.uid()::text 
    OR user_id = (SELECT id::text FROM public.users WHERE auth_user_id = auth.uid())
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_id = auth.uid()::text 
    OR user_id = (SELECT id::text FROM public.users WHERE auth_user_id = auth.uid())
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS user_workspaces_delete_own ON public.user_workspaces;
CREATE POLICY user_workspaces_delete_own ON public.user_workspaces
  FOR DELETE
  USING (
    user_id = auth.uid()::text 
    OR user_id = (SELECT id::text FROM public.users WHERE auth_user_id = auth.uid())
    OR auth.role() = 'service_role'
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_workspaces_updated_at ON public.user_workspaces(updated_at DESC);

COMMIT;
