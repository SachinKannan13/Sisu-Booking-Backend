-- ============================================================
-- BookSphere Migration 014 — Builder Ideas
-- Moves Builder Studio ideas from localStorage to Supabase so
-- they persist across devices and sessions. RLS-scoped to the
-- owning user, consistent with every other user-owned table.
-- Run in Supabase SQL Editor after migrations_013.
-- ============================================================

CREATE TABLE IF NOT EXISTS builder_ideas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  principle   TEXT,
  lens        TEXT NOT NULL DEFAULT 'life',
  notes       TEXT,
  source_ids  UUID[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lens values: life | relationships | habits | career | creativity | community | business
-- Not enforced by constraint so new lenses can be added without a migration.

ALTER TABLE builder_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own builder ideas"
  ON builder_ideas
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for the common query pattern: all ideas for a user ordered by created_at
CREATE INDEX IF NOT EXISTS builder_ideas_user_created
  ON builder_ideas (user_id, created_at DESC);
