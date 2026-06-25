-- ============================================================
-- Migration 007 — Unified Knowledge Base
-- Run in Supabase SQL Editor after all existing migrations
-- Non-destructive: IF NOT EXISTS guards throughout
-- ============================================================

-- Extend books table to support all source types
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'book'
    CHECK (source_type IN ('book','article','essay','paper','transcript','interview','note','url')),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS publication_date TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ideal_reader_stage TEXT DEFAULT 'any';

-- Add rich attribution to every chunk
ALTER TABLE book_chunks
  ADD COLUMN IF NOT EXISTS source_author TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_title  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_type   TEXT DEFAULT 'book',
  ADD COLUMN IF NOT EXISTS section_label TEXT DEFAULT '';

-- Performance indexes
CREATE INDEX IF NOT EXISTS books_source_type_idx       ON books(source_type);
CREATE INDEX IF NOT EXISTS books_user_source_idx        ON books(user_id, source_type);
CREATE INDEX IF NOT EXISTS book_chunks_source_type_idx  ON book_chunks(source_type);

-- Cross-KB semantic search function (searches all of a user's chunks)
CREATE OR REPLACE FUNCTION match_kb_chunks(
  query_embedding   VECTOR(1536),
  filter_user_id    UUID,
  match_count       INT,
  filter_source_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id           UUID,
  book_id      UUID,
  chunk_index  INT,
  content      TEXT,
  chapter_title TEXT,
  source_author TEXT,
  source_title  TEXT,
  source_type   TEXT,
  section_label TEXT,
  similarity    FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.id, bc.book_id, bc.chunk_index, bc.content,
    bc.chapter_title, bc.source_author, bc.source_title,
    bc.source_type, bc.section_label,
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
