-- ============================================================
-- BookSphere Migration v5 — User Profiles
-- Run in Supabase SQL Editor AFTER migrations_004_story_scene_art.sql
--
-- NOTE: numbered 005 (not 004) to continue this project's existing
-- sequence (001 -> 002 -> 003 -> 004 [scene art] -> 005 [this file] ->
-- 006 [chennai depth]).
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  industry TEXT,
  stage TEXT CHECK (stage IN ('idea', 'mvp', 'growth', 'scale', 'established', 'other')),
  team_size TEXT,
  main_goal TEXT,
  current_challenge TEXT,
  past_wins TEXT,
  preferred_chennai_area TEXT,
  profile_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON user_profiles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
