-- ============================================================
-- Migration 010 — Continuous Learning Memory
-- ============================================================

CREATE TABLE IF NOT EXISTS insights (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id   UUID REFERENCES learning_sessions(id) ON DELETE SET NULL,
  source_ids   UUID[] DEFAULT '{}',
  content      TEXT NOT NULL,
  tags         TEXT[] DEFAULT '{}',
  insight_type TEXT DEFAULT 'observation'
    CHECK (insight_type IN ('observation','principle','question','framework','reflection','experiment_result')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS concept_nodes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  description  TEXT,
  source_ids   UUID[] DEFAULT '{}',
  insight_ids  UUID[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS concept_edges (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_id      UUID REFERENCES concept_nodes(id) ON DELETE CASCADE,
  to_id        UUID REFERENCES concept_nodes(id) ON DELETE CASCADE,
  relationship TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own insights" ON insights
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own concept nodes" ON concept_nodes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own concept edges" ON concept_edges
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS insights_user_idx ON insights(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS concept_nodes_user_idx ON concept_nodes(user_id);
CREATE INDEX IF NOT EXISTS concept_edges_user_idx ON concept_edges(user_id);
