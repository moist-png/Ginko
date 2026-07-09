-- ============================================================================
--  Migration: add a Notes field to Trees
--
--  Run this in Supabase: Project -> SQL Editor -> New query -> paste -> Run.
--
--  Safe to run any time — it only adds one column, and does nothing if that
--  column already exists. No existing data is touched or removed.
--
--  IMPORTANT: run this BEFORE (or immediately after) deploying the app
--  update that adds the Notes tab to a tree's page. The app now always
--  sends a `notes` value when saving a tree, so saving any tree will fail
--  with a database error until this column exists.
-- ============================================================================

alter table public.trees
  add column if not exists notes jsonb not null default '[]'::jsonb;

-- ============================================================================
--  Done. Trees now have their own Notes tab, independent of any report.
-- ============================================================================
