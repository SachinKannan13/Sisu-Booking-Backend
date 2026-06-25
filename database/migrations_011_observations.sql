-- ============================================================
-- Migration 011 — Observation Journal
-- Adds an observations JSONB log to the experiments table.
-- Each entry is: { "text": "...", "created_at": "ISO timestamp" }
-- ============================================================

ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS observations JSONB DEFAULT '[]';
