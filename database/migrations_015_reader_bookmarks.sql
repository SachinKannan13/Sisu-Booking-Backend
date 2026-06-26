-- ============================================================
-- BookSphere Migration 015 — Reader bookmarks column
-- Adds a `bookmarks` JSONB column to reading_progress so the
-- new Kindle-grade reader can persist bookmarks per book/user.
-- Shape of each bookmark:
--   { id, chunk_index, label, created_at }
-- Non-destructive: only alters an existing column; safe to
-- re-run (IF NOT EXISTS semantics via ALTER COLUMN DEFAULT).
-- ============================================================

ALTER TABLE reading_progress
  ADD COLUMN IF NOT EXISTS bookmarks JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill existing rows that have a NULL (shouldn't happen, but be safe)
UPDATE reading_progress SET bookmarks = '[]'::jsonb WHERE bookmarks IS NULL;
