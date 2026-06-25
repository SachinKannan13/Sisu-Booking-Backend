-- ============================================================
-- Migration 012 — Schema Fixes + Embedding Status + RRF Support
-- Run AFTER migrations 007–011
-- Non-destructive: IF NOT EXISTS / OR REPLACE throughout
-- ============================================================

-- 1. Fix: add 'builder' to the learning_sessions mode constraint
ALTER TABLE learning_sessions
  DROP CONSTRAINT IF EXISTS learning_sessions_mode_check;
ALTER TABLE learning_sessions
  ADD CONSTRAINT learning_sessions_mode_check
  CHECK (mode IN ('scholar','critic','synthesizer','practitioner',
                  'teacher','experiment','builder'));

-- 2. Add embedding_status to books
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending'
    CHECK (embedding_status IN ('pending','processing','complete','failed'));
CREATE INDEX IF NOT EXISTS books_embedding_status_idx
  ON books(user_id, embedding_status);

-- 3. Add chapter_index to book_chunks
ALTER TABLE book_chunks
  ADD COLUMN IF NOT EXISTS chapter_index INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS book_chunks_chapter_idx
  ON book_chunks(book_id, chapter_index);

-- 4. RRF helper function
CREATE OR REPLACE FUNCTION rrf_score(
  rank_semantic INT,
  rank_fts      INT,
  k             INT DEFAULT 60
)
RETURNS FLOAT
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    COALESCE(1.0 / (k + rank_semantic), 0.0) +
    COALESCE(1.0 / (k + rank_fts),      0.0);
$$;

-- 5. Update match_kb_chunks to return section_label and page_estimate
-- DROP required because PostgreSQL won't allow changing return type via CREATE OR REPLACE
DROP FUNCTION IF EXISTS match_kb_chunks(vector, uuid, integer, uuid[]);
CREATE OR REPLACE FUNCTION match_kb_chunks(
  query_embedding   VECTOR(1536),
  filter_user_id    UUID,
  match_count       INT,
  filter_source_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  book_id       UUID,
  chunk_index   INT,
  content       TEXT,
  chapter_title TEXT,
  chapter_index INT,
  source_author TEXT,
  source_title  TEXT,
  source_type   TEXT,
  section_label TEXT,
  page_estimate INT,
  similarity    FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.id, bc.book_id, bc.chunk_index, bc.content,
    bc.chapter_title, bc.chapter_index,
    bc.source_author, bc.source_title,
    bc.source_type, bc.section_label, bc.page_estimate,
    1 - (bc.embedding <=> query_embedding) AS similarity
  FROM book_chunks bc
  JOIN books b ON b.id = bc.book_id
  WHERE b.user_id = filter_user_id
    AND bc.embedding IS NOT NULL
    AND (filter_source_ids IS NULL OR bc.book_id = ANY(filter_source_ids))
  ORDER BY bc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. Add session_count to concept_nodes
ALTER TABLE concept_nodes
  ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 1;

-- 7. Add weight to concept_edges
ALTER TABLE concept_edges
  ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0;

-- 8. GIN index on insights.tags
CREATE INDEX IF NOT EXISTS insights_tags_idx
  ON insights USING gin(tags);

-- 9. Index on concept_nodes label
CREATE INDEX IF NOT EXISTS concept_nodes_label_idx
  ON concept_nodes(user_id, lower(label));
