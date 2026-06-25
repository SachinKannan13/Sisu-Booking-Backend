-- ============================================================
-- BookSphere Database Migration v2.0 — Deep Chennai Knowledge Base
-- Run this in your Supabase SQL Editor AFTER migrations.sql
-- Non-destructive: only adds columns/extension/function/index.
-- ============================================================

-- 1. Enable pgvector for semantic similarity search.
-- Supabase ships pgvector by default; this is a no-op if already enabled.
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Extend chennai_areas with richer, time-aware, street-level detail
--    and a slot for the semantic embedding of each location.
ALTER TABLE chennai_areas
  ADD COLUMN IF NOT EXISTS time_context JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS micro_locations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

-- time_context shape (per row), e.g.:
-- {
--   "dawn":    "Joggers and fishermen, soft pink light over the Bay of Bengal.",
--   "morning": "Vendors setting up, gentle crowds, filter coffee smell drifting from stalls.",
--   "afternoon": "Quiet, the heat keeps casual visitors away, a few umbrellas.",
--   "evening": "Packed with families, kite-flyers, sunset crowds, bhel and sundal vendors.",
--   "night":   "Lit by sodium lamps, security patrols, the surf is the loudest thing left."
-- }

-- micro_locations shape (per row), e.g.:
-- [
--   { "name": "Lighthouse end near Foreshore Estate", "note": "Quietest stretch, good for a slow walk." },
--   { "name": "MGR/Kamarajar statue plaza", "note": "Where evening crowds and vendors concentrate." }
-- ]

-- 3. Vector index for fast cosine-similarity search.
-- (ivfflat requires ANALYZE after bulk insert/backfill for good recall.)
CREATE INDEX IF NOT EXISTS chennai_areas_embedding_idx
  ON chennai_areas USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. RPC function for semantic retrieval: returns the closest N areas to a
--    query embedding by cosine distance. Called from chennaiEngine.js via
--    supabase.rpc('match_chennai_areas', { query_embedding, match_count }).
CREATE OR REPLACE FUNCTION match_chennai_areas(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  area_type TEXT,
  description TEXT,
  lat FLOAT,
  lng FLOAT,
  tags TEXT[],
  storytelling_notes TEXT,
  time_context JSONB,
  micro_locations JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    chennai_areas.id,
    chennai_areas.name,
    chennai_areas.area_type,
    chennai_areas.description,
    chennai_areas.lat,
    chennai_areas.lng,
    chennai_areas.tags,
    chennai_areas.storytelling_notes,
    chennai_areas.time_context,
    chennai_areas.micro_locations,
    1 - (chennai_areas.embedding <=> query_embedding) AS similarity
  FROM chennai_areas
  WHERE chennai_areas.embedding IS NOT NULL
  ORDER BY chennai_areas.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Done. Next steps (run from server/ directory):
--   1. node database/seedChennai.js        -- inserts the full location dataset
--   2. node database/embedChennaiAreas.js  -- backfills the embedding column via OpenRouter
--   3. node database/testChennaiRetrieval.js -- sanity-checks retrieval quality
