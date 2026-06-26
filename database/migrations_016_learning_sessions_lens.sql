-- ============================================================
-- Migration 016 — Add lens column to learning_sessions
-- Adds the lens field that routes/learn.js writes on session
-- creation (added in Phase 5 but omitted from migration 008).
-- ============================================================

ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS lens TEXT DEFAULT 'life';
