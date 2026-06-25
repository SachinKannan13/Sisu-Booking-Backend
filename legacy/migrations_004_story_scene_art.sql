-- ============================================================
-- BookSphere Database Migration v4 — AI-generated scene art per slide
-- Run in Supabase SQL Editor AFTER migrations_003_book_embeddings.sql
-- Non-destructive: only adds a column.
--
-- NOTE: the original spec text called this "migration 004" and a later
-- phase (user profiles) "migration 004" too — both can't share a number.
-- Numbering here continues sequentially from the migrations already in
-- this project (001 -> 002 -> 003 -> 004 [this file] -> 005 [user
-- profiles] -> 006 [chennai depth]). See the final summary for the full
-- run order.
-- ============================================================

ALTER TABLE stories ADD COLUMN IF NOT EXISTS slides_with_art JSONB DEFAULT '[]'::jsonb;

-- `slides` stays exactly as-is (no scene_svg). `slides_with_art` holds the
-- same slide objects with an added `scene_svg` field per slide — either a
-- raw <svg>...</svg> string from sceneArtService.js, or null if generation
-- failed for that slide (client falls back to the scene_template component).
