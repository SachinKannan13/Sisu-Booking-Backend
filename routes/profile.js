import express from 'express';
import supabase from '../database/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// True if `error` looks like "the user_profiles table/column doesn't exist
// yet" rather than a real failure — i.e. migrations_005_user_profiles.sql
// hasn't been run against this Supabase project yet. We treat that the same
// as "no profile exists" (200/null) instead of 500, so the rest of the app
// degrades gracefully instead of spamming errors before setup is finished.
function isMissingProfileSchema(error) {
  if (!error) return false;
  if (['PGRST116', 'PGRST205', 'PGRST204', '42P01'].includes(error.code)) return true;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('could not find');
}

// GET /api/profile — get current user's profile
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (error && !isMissingProfileSchema(error)) {
    return res.status(500).json({ error: error.message });
  }
  if (error) {
    console.warn('[profile] user_profiles table not found yet — run migrations_005_user_profiles.sql. Returning null profile.');
  }

  res.json(data || null);
});

// POST /api/profile — create or update profile
router.post('/', requireAuth, async (req, res) => {
  const {
    business_name, industry, stage, team_size,
    main_goal, current_challenge, past_wins, preferred_chennai_area
  } = req.body;

  const profile_complete = !!(business_name && industry && stage);

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: req.user.id,
      business_name, industry, stage, team_size,
      main_goal, current_challenge, past_wins, preferred_chennai_area,
      profile_complete
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error && isMissingProfileSchema(error)) {
    return res.status(503).json({ error: 'Profile storage is not set up yet — run migrations_005_user_profiles.sql in the Supabase SQL editor, then try again.' });
  }
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/profile — partial update
router.patch('/', requireAuth, async (req, res) => {
  const updates = {};
  const allowed = ['business_name', 'industry', 'stage', 'team_size', 'main_goal', 'current_challenge', 'past_wins', 'preferred_chennai_area'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Keep profile_complete accurate after a partial update too.
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('business_name, industry, stage')
    .eq('user_id', req.user.id)
    .single();

  const merged = { ...existing, ...updates };
  updates.profile_complete = !!(merged.business_name && merged.industry && merged.stage);

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error && isMissingProfileSchema(error)) {
    return res.status(503).json({ error: 'Profile storage is not set up yet — run migrations_005_user_profiles.sql in the Supabase SQL editor, then try again.' });
  }
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
