-- ============================================================
-- Migration 009 — Experiments
-- ============================================================

CREATE TABLE IF NOT EXISTS experiments (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id         UUID REFERENCES learning_sessions(id) ON DELETE SET NULL,
  title              TEXT NOT NULL,
  principle          TEXT NOT NULL,
  source_ids         UUID[] DEFAULT '{}',
  hypothesis         TEXT,
  variables          JSONB DEFAULT '[]',
  risks              JSONB DEFAULT '[]',
  success_measures   JSONB DEFAULT '[]',
  observation_method TEXT,
  predicted_outcome  TEXT,
  actual_outcome     TEXT,
  lessons_learned    TEXT,
  status             TEXT DEFAULT 'designed'
    CHECK (status IN ('designed','running','completed','abandoned')),
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own experiments" ON experiments
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS experiments_user_idx ON experiments(user_id, status);
