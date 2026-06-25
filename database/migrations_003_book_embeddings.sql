-- ============================================================
-- BookSphere Database Migration v3.0 — Book Chunk Embeddings
-- Run this in your Supabase SQL Editor AFTER migrations.sql and
-- migrations_002_chennai_deep.sql (pgvector is already enabled by 002,
-- but the CREATE EXTENSION line below is repeated here so this file
-- also runs standalone).
-- Non-destructive: only adds a column/index/function.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE book_chunks
  ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

CREATE INDEX IF NOT EXISTS book_chunks_embedding_idx
  ON book_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_book_chunks(
  query_embedding VECTOR(1536),
  filter_book_id UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  book_id UUID,
  chunk_index INTEGER,
  content TEXT,
  chapter_title TEXT,
  page_estimate INTEGER,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    book_chunks.id,
    book_chunks.book_id,
    book_chunks.chunk_index,
    book_chunks.content,
    book_chunks.chapter_title,
    book_chunks.page_estimate,
    1 - (book_chunks.embedding <=> query_embedding) AS similarity
  FROM book_chunks
  WHERE book_chunks.embedding IS NOT NULL
    AND book_chunks.book_id = filter_book_id
  ORDER BY book_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Done. Newly uploaded books will have their chunks embedded automatically
-- in the background during processing (see embeddingService.js +
-- bookProcessor.js). Books uploaded BEFORE this migration was applied will
-- have embedding = NULL for all their chunks — retrieveRelevantChunks()
-- gracefully falls back to full-text search for those until/unless you
-- backfill them manually.
