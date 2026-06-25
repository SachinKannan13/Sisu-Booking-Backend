import express from 'express';
import supabase from '../database/supabase.js';

const router = express.Router();

// GET /api/chennai/areas — no auth required
router.get('/areas', async (req, res) => {
  const { data, error } = await supabase
    .from('chennai_areas')
    .select('*')
    .order('area_type', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Group by area_type
  const grouped = {};
  (data || []).forEach(area => {
    if (!grouped[area.area_type]) grouped[area.area_type] = [];
    grouped[area.area_type].push(area);
  });

  res.json({ areas: data || [], grouped });
});

// GET /api/chennai/search?q=
router.get('/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q.trim()) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  const { data, error } = await supabase
    .from('chennai_areas')
    .select('*')
    .or(`name.ilike.%${q}%,description.ilike.%${q}%,storytelling_notes.ilike.%${q}%`)
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// GET /api/chennai/route?from=Mylapore&to=Marina+Beach
// Requires migrations_006_chennai_depth.sql to have been run; returns an
// empty array (not an error) if the chennai_routes table has no match yet.
router.get('/route', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to are required' });

  const { data, error } = await supabase
    .from('chennai_routes')
    .select('*')
    .or(`from_area.ilike.%${from}%,to_area.ilike.%${to}%`)
    .limit(5);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

export default router;
