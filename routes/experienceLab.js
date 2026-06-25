import express from 'express';
import supabase from '../database/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiRateLimit.js';
import { retrieveAcrossKB, formatChunksWithAttribution } from '../services/ragEngine.js';
import { learnWithSources } from '../services/claudeService.js';
import { isMissingSchema } from '../utils/schemaErrors.js';

const router = express.Router();
const EXPERIMENTS_NOT_SET_UP = 'Experiments are not set up yet — run migrations_009_experiments.sql in the Supabase SQL editor, then try again.';

router.get('/health', (req, res) => res.json({ status: 'ok' }));

// POST /api/lab/design   { principle, source_ids, session_id }
router.post('/design', requireAuth, aiLimiter, async (req, res) => {
  const { principle, source_ids, session_id } = req.body;
  if (!principle || !principle.trim()) return res.status(400).json({ error: 'principle is required' });

  try {
    const chunks = await retrieveAcrossKB(
      req.user.id,
      principle,
      10,
      source_ids && source_ids.length ? source_ids : null
    );
    const formattedChunks = formatChunksWithAttribution(chunks);

    const result = await learnWithSources(
      { mode: 'experiment', topic: principle, loop_step: 0 },
      formattedChunks,
      [],
      principle
    );

    res.json({
      experiment_draft: result.mode_output,
      session_id: session_id || null
    });
  } catch (err) {
    console.error('[lab/design] Error:', err.message);
    res.status(500).json({ error: 'Failed to design experiment. Please try again.' });
  }
});

// POST /api/lab/experiment — save a designed experiment
router.post('/experiment', requireAuth, async (req, res) => {
  const {
    title, principle, source_ids, hypothesis, variables,
    risks, success_measures, observation_method, predicted_outcome, session_id
  } = req.body;

  if (!principle || !principle.trim()) return res.status(400).json({ error: 'principle is required' });

  const { data, error } = await supabase
    .from('experiments')
    .insert({
      user_id: req.user.id,
      session_id: session_id || null,
      title: title || principle.slice(0, 80),
      principle,
      source_ids: source_ids || [],
      hypothesis: hypothesis || '',
      variables: variables || [],
      risks: risks || [],
      success_measures: success_measures || [],
      observation_method: observation_method || '',
      predicted_outcome: predicted_outcome || '',
      status: 'designed'
    })
    .select()
    .single();

  if (error) {
    if (isMissingSchema(error)) {
      return res.status(501).json({ error: EXPERIMENTS_NOT_SET_UP });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

// GET /api/lab/experiments
router.get('/experiments', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  res.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');

  const { data, error } = await supabase
    .from('experiments')
    .select('id, title, hypothesis, principle, status, predicted_outcome, actual_outcome, lessons_learned, observations, variables, success_measures, session_id, created_at, started_at, completed_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingSchema(error)) {
      return res.json({ experiments: [] });
    }
    return res.status(500).json({ error: error.message });
  }

  res.json({ experiments: data || [] });
});

// PATCH /api/lab/:id/update   { status }  — designed|running|completed|abandoned
const VALID_STATUSES = ['designed', 'running', 'completed', 'abandoned'];

router.patch('/:id/update', requireAuth, async (req, res) => {
  const { status, ...rest } = req.body;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const updates = { ...rest };
  if (status) {
    updates.status = status;
    if (status === 'running') updates.started_at = new Date().toISOString();
    if (status === 'completed' || status === 'abandoned') updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('experiments')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error && isMissingSchema(error)) return res.status(501).json({ error: EXPERIMENTS_NOT_SET_UP });
  if (error || !data) return res.status(404).json({ error: 'Experiment not found' });
  res.json(data);
});

// POST /api/lab/:id/capture   { actual_outcome, lessons_learned }
router.post('/:id/capture', requireAuth, async (req, res) => {
  const { actual_outcome, lessons_learned } = req.body;

  const { data, error } = await supabase
    .from('experiments')
    .update({
      status: 'completed',
      actual_outcome: actual_outcome || '',
      lessons_learned: lessons_learned || '',
      completed_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error && isMissingSchema(error)) return res.status(501).json({ error: EXPERIMENTS_NOT_SET_UP });
  if (error || !data) return res.status(404).json({ error: 'Experiment not found' });

  // Best-effort: turn the captured lesson into a permanent insight.
  // Never let a failure here affect the capture response — the
  // experiment is already saved at this point.
  try {
    if (lessons_learned && lessons_learned.trim()) {
      await supabase.from('insights').insert({
        user_id: req.user.id,
        session_id: data.session_id || null,
        source_ids: data.source_ids || [],
        content: lessons_learned.trim(),
        tags: ['experiment'],
        insight_type: 'experiment_result'
      });
    }
  } catch (_) { /* silently no-op — insights table may not exist yet */ }

  res.json(data);
});

// POST /api/lab/:id/review   { actual_outcome }  — AI gap analysis
router.post('/:id/review', requireAuth, aiLimiter, async (req, res) => {
  const { actual_outcome } = req.body;
  if (!actual_outcome || !actual_outcome.trim()) {
    return res.status(400).json({ error: 'actual_outcome is required' });
  }
  const { data: exp, error: fetchError } = await supabase
    .from('experiments')
    .select('id, title, hypothesis, predicted_outcome, principle, status')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();
  if (fetchError && isMissingSchema(fetchError)) return res.status(501).json({ error: EXPERIMENTS_NOT_SET_UP });
  if (fetchError || !exp) return res.status(404).json({ error: 'Experiment not found' });
  try {
    const { reviewExperiment } = await import('../services/claudeService.js');
    const analysis = await reviewExperiment(exp, actual_outcome.trim());
    return res.json(analysis);
  } catch (err) {
    console.error('[lab/review] AI analysis failed:', err.message);
    return res.json({ gap_analysis: null, lesson: null, confidence: 'low' });
  }
});

// POST /api/lab/:id/observe   { observation }  — append to the observations log
router.post('/:id/observe', requireAuth, async (req, res) => {
  const { observation } = req.body;
  if (!observation || !observation.trim()) return res.status(400).json({ error: 'observation is required' });

  const { data: exp, error: fetchError } = await supabase
    .from('experiments')
    .select('observations')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (fetchError && isMissingSchema(fetchError)) return res.status(501).json({ error: EXPERIMENTS_NOT_SET_UP });
  if (fetchError || !exp) return res.status(404).json({ error: 'Experiment not found' });

  const existing = Array.isArray(exp.observations) ? exp.observations : [];
  const entry = { text: observation.trim(), created_at: new Date().toISOString() };

  const { error: updateError } = await supabase
    .from('experiments')
    .update({ observations: [...existing, entry] })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (updateError) return res.status(500).json({ error: updateError.message });

  res.json({ observations: [...existing, entry] });
});

export default router;
