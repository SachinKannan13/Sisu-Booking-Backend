/**
 * POST /api/simulate
 *
 * Generates a multi-beat cinematic simulation of a principle from the user's
 * Knowledge Canon, grounded in retrieved passages + optional Chennai context.
 *
 * Body: { principle, source_ids?, lens?, use_chennai? }
 * Returns: { simulation: SimulationResult }
 */
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter }   from '../middleware/aiRateLimit.js';
import { retrieveAcrossKB, formatChunksWithAttribution } from '../services/ragEngine.js';
import { callOpenRouter, parseJSON }                     from '../services/claudeService.js';
import { buildSimulationPrompt }                         from '../prompts/simulationPrompt.js';
import { validateSceneKey }                              from '../services/simulation/sceneRegistry.js';
import supabase from '../database/supabase.js';

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.post('/', requireAuth, aiLimiter, async (req, res) => {
  const { principle, source_ids, lens = 'life', use_chennai = true } = req.body;

  if (!principle?.trim()) {
    return res.status(400).json({ error: 'principle is required' });
  }

  try {
    // ── 1. Retrieve relevant chunks from the knowledge base ─────────
    const chunks = await retrieveAcrossKB(
      req.user.id,
      principle,
      12,
      source_ids?.length ? source_ids : null
    );
    const formattedChunks = formatChunksWithAttribution(chunks);

    // ── 2. Optional Chennai / real-world location context ───────────
    let chennaiContext = '';
    if (use_chennai) {
      try {
        const { getChennaiContext } = await import('../services/simulation/chennaiEngine.js');
        chennaiContext = await getChennaiContext(principle);
      } catch (err) {
        console.warn('[simulate] Chennai context unavailable:', err.message);
      }
    }

    // ── 3. Pull user's learning journey for context injection ────────
    let learningContext = '';
    try {
      const memoryService = await import('../services/memoryService.js');
      learningContext = await memoryService.getUserLearningContext(req.user.id);
    } catch (_) {}

    // ── 4. Build prompt and call AI ──────────────────────────────────
    const systemPrompt = buildSimulationPrompt(
      principle.trim(),
      formattedChunks,
      lens,
      chennaiContext,
      learningContext
    );

    const raw = await callOpenRouter(
      systemPrompt,
      [{ role: 'user', content: `Generate the simulation for: "${principle.trim()}"` }],
      4000
    );

    // ── 5. Parse + validate ──────────────────────────────────────────
    let simulation;
    try {
      simulation = parseJSON(raw, 'simulation');
    } catch {
      return res.status(502).json({ error: 'AI returned malformed simulation JSON. Please try again.' });
    }

    // Validate all scene_keys against the registry so the client never
    // receives a key that has no matching component.
    if (simulation.setting?.scene_key) {
      simulation.setting.scene_key = validateSceneKey(simulation.setting.scene_key);
    }
    if (Array.isArray(simulation.beats)) {
      simulation.beats = simulation.beats.map(beat => ({
        ...beat,
        scene_key: validateSceneKey(beat.scene_key),
      }));
    }

    res.json({ simulation });

    // ── 6. Non-blocking: persist principle + experiment as insights ──
    setImmediate(async () => {
      try {
        const rows = [];
        // The principle itself becomes a 'simulation' insight
        rows.push({
          user_id:      req.user.id,
          content:      `[Simulation] ${principle.trim()}`,
          tags:         ['simulation', lens, ...(source_ids?.slice(0, 3) || [])],
          source_ids:   source_ids || [],
          insight_type: 'simulation'
        });
        // If the simulation produced a 7-day experiment, save that too
        if (simulation.seven_day_experiment?.trim?.()) {
          rows.push({
            user_id:      req.user.id,
            content:      simulation.seven_day_experiment.trim(),
            tags:         ['simulation', 'experiment-idea', lens],
            source_ids:   source_ids || [],
            insight_type: 'experiment_idea'
          });
        }
        const { data: saved, error } = await supabase
          .from('insights')
          .insert(rows)
          .select();
        if (!error && saved) {
          const ms = await import('../services/memoryService.js');
          for (const insight of saved) {
            await ms.processInsightForConcepts(req.user.id, insight).catch(() => {});
          }
        }
      } catch (_) { /* best-effort, never affects response */ }
    });

  } catch (err) {
    console.error('[simulate] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate simulation. Please try again.' });
  }
});

export default router;
