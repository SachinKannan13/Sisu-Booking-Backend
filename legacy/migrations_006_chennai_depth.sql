-- ============================================================
-- BookSphere Migration v6 — Chennai Intelligence Depth
-- Run in Supabase SQL Editor AFTER migrations_005_user_profiles.sql
--
-- NOTE: numbered 006 (not 005) to continue this project's existing
-- sequence (001 -> 002 -> 003 -> 004 [scene art] -> 005 [user profiles]
-- -> 006 [this file]).
-- ============================================================

-- Seasonal context column on chennai_areas
ALTER TABLE chennai_areas
  ADD COLUMN IF NOT EXISTS seasonal_context JSONB DEFAULT '{}'::jsonb;

-- seasonal_context shape:
-- {
--   "jan_feb": "Cool pleasant mornings, Pongal festival aftermath, silk sarees everywhere in Mylapore...",
--   "mar_may": "Brutal heat sets in from March, the city empties in afternoons, mangoes appear in market...",
--   "jun_sep": "Pre-monsoon humidity, then southwest monsoon influence, greener, cooler evenings...",
--   "oct_nov": "Northeast monsoon — Chennai's heaviest rains, flooding risk on low roads, dramatic skies...",
--   "dec": "Margazhi cultural season, sabha season begins, morning Carnatic concerts in Mylapore, pleasant weather..."
-- }

-- Routes between Chennai areas for story scene transitions
CREATE TABLE IF NOT EXISTS chennai_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_area TEXT NOT NULL,
  to_area TEXT NOT NULL,
  travel_time_mins INTEGER,
  travel_mode TEXT DEFAULT 'auto', -- auto | metro | walk | ecr_drive
  route_description TEXT,          -- Sensory prose of the journey
  landmarks_en_route TEXT[] DEFAULT '{}',
  weather_notes TEXT,              -- How this route feels in rain/heat etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chennai_routes_from_idx ON chennai_routes(from_area);
CREATE INDEX IF NOT EXISTS chennai_routes_to_idx ON chennai_routes(to_area);

ALTER TABLE chennai_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads routes" ON chennai_routes;
CREATE POLICY "Anyone reads routes" ON chennai_routes FOR SELECT USING (true);
