-- ============================================================
-- Migration 013 — Processing Jobs Queue
-- ============================================================
CREATE TABLE IF NOT EXISTS processing_jobs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type     TEXT NOT NULL
    CHECK (job_type IN ('embed_book','extract_concepts','summarize_session')),
  payload      JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','complete','failed')),
  attempts     INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_msg    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON processing_jobs
  USING (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS processing_jobs_status_idx
  ON processing_jobs(status, created_at)
  WHERE status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS processing_jobs_user_idx
  ON processing_jobs(user_id, status);
