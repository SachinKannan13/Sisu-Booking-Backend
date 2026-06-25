-- ============================================================
-- Migration 008 — Learning Sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_sessions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_ids  UUID[] DEFAULT '{}',
  topic       TEXT NOT NULL,
  mode        TEXT NOT NULL CHECK (mode IN ('scholar','critic','synthesizer','practitioner','teacher','experiment')),
  loop_step   INTEGER DEFAULT 0,
  loop_state  JSONB DEFAULT '{}',
  messages    JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON learning_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS learning_sessions_user_idx
  ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS learning_sessions_updated_idx
  ON learning_sessions(user_id, updated_at DESC);
