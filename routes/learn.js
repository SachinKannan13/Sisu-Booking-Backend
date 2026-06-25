import express from 'express';
import supabase from '../database/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiRateLimit.js';
import { retrieveAcrossKB, formatChunksWithAttribution } from '../services/ragEngine.js';
import { learnWithSources, summarizeSession } from '../services/claudeService.js';
import { isMissingSchema } from '../utils/schemaErrors.js';

const router = express.Router();

const VALID_MODES = ['scholar', 'critic', 'synthesizer', 'practitioner', 'teacher', 'experiment', 'builder'];
const SESSIONS_NOT_SET_UP = 'Learning sessions are not set up yet — run migrations_008_learning_sessions.sql in the Supabase SQL editor, then try again.';

router.get('/health', (req, res) => res.json({ status: 'ok' }));

// POST /api/learn/session   { topic, mode, source_ids }
router.post('/session', requireAuth, async (req, res) => {
  const { topic, mode, source_ids } = req.body;

  if (!topic || !topic.trim()) return res.status(400).json({ error: 'topic is required' });
  if (!VALID_MODES.includes(mode)) {
    return res.status(400).json({ error: `mode must be one of: ${VALID_MODES.join(', ')}` });
  }

  const { data, error } = await supabase
    .from('learning_sessions')
    .insert({
      user_id: req.user.id,
      topic: topic.trim(),
      mode,
      source_ids: source_ids || [],
      loop_step: 0,
      loop_state: {},
      messages: []
    })
    .select()
    .single();

  if (error) {
    if (isMissingSchema(error)) return res.status(501).json({ error: SESSIONS_NOT_SET_UP });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// GET /api/learn/sessions
router.get('/sessions', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
  const { data, error } = await supabase
    .from('learning_sessions')
    .select('id, topic, mode, loop_step, source_ids, created_at, updated_at')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    // No sessions table yet (migration 008 not run) — degrade to an empty
    // list rather than break the whole LearnHub page before setup.
    if (isMissingSchema(error)) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

// GET /api/learn/session/:id
router.get('/session/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('learning_sessions')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error && isMissingSchema(error)) return res.status(501).json({ error: SESSIONS_NOT_SET_UP });
  if (error || !data) return res.status(404).json({ error: 'Session not found' });
  res.json(data);
});

// POST /api/learn/session/:id/ask   { message }
router.post('/session/:id/ask', requireAuth, aiLimiter, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'message is required' });

  const { data: session, error: sessionError } = await supabase
    .from('learning_sessions')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (sessionError && isMissingSchema(sessionError)) return res.status(501).json({ error: SESSIONS_NOT_SET_UP });
  if (sessionError || !session) return res.status(404).json({ error: 'Session not found' });

  try {
    const query = session.topic + '\n\n' + message;
    const chunks = await retrieveAcrossKB(
      req.user.id, query, 10,
      session.source_ids && session.source_ids.length ? session.source_ids : null
    );
    const formattedChunks = formatChunksWithAttribution(chunks);
    let learningContext = '';
    try {
      const memoryService = await import('../services/memoryService.js');
      learningContext = await memoryService.getUserLearningContext(req.user.id);
    } catch (_) {}

    // Try streaming path first
    let systemPrompt, maxTokens;
    try {
      const { buildModePrompt, MODE_MAX_TOKENS } = await import('../prompts/learningModePrompts.js');
      systemPrompt = buildModePrompt(session.mode, session.topic, formattedChunks, session.loop_step || 0, learningContext);
      maxTokens = MODE_MAX_TOKENS[session.mode] || 2500;
    } catch (_) {
      // Prompts module unavailable — use non-streaming learnWithSources fallback
      const result = await learnWithSources(
        { ...session, learning_context: learningContext },
        formattedChunks,
        session.messages || [],
        message
      );
      const updatedMessages = [
        ...(session.messages || []),
        { role: 'user', content: message, created_at: new Date().toISOString() },
        { role: 'assistant', content: result.mode_output, created_at: new Date().toISOString() }
      ];
      let nextStep = session.loop_step;
      if (session.mode === 'teacher' && result.can_advance && session.loop_step < 9) nextStep = session.loop_step + 1;
      await supabase.from('learning_sessions').update({ messages: updatedMessages, loop_step: nextStep, updated_at: new Date().toISOString() }).eq('id', session.id);
      return res.json({ session: { ...session, messages: updatedMessages, loop_step: nextStep }, result });
    }

    const historyMessages = (session.messages || [])
      .slice(-8)
      .map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }));

    const { callOpenRouterStream, parseJSON: parseAIJSON } = await import('../services/claudeService.js');
    let fullText = '';
    try {
      fullText = await callOpenRouterStream(
        systemPrompt,
        [...historyMessages, { role: 'user', content: message }],
        maxTokens,
        res
      );
    } catch (streamErr) {
      console.error('[learn/ask] Stream error:', streamErr.message);
      return;
    }

    let parsed;
    try {
      parsed = parseAIJSON(fullText, session.mode + ' mode response');
    } catch (_) {
      parsed = { evidence_blocks: [], response: fullText.trim(), followup_questions: [] };
    }

    const result = {
      evidence_blocks:    parsed.evidence_blocks || [],
      interpretation:     parsed.what_authors_said || parsed.response || parsed.synthesis_insight || '',
      synthesis:          parsed.novel_combination || parsed.verdict || '',
      mode_output:        parsed,
      followup_questions: parsed.followup_questions || [],
      loop_step:          session.loop_step || 0,
      can_advance:        parsed.can_advance !== false
    };

    let nextLoopStep = session.loop_step;
    if (session.mode === 'teacher' && result.can_advance && session.loop_step < 9) {
      nextLoopStep = session.loop_step + 1;
    }

    const updatedMessages = [
      ...(session.messages || []),
      { role: 'user',      content: message,           created_at: new Date().toISOString() },
      { role: 'assistant', content: result.mode_output, created_at: new Date().toISOString() }
    ];

    supabase
      .from('learning_sessions')
      .update({ messages: updatedMessages, loop_step: nextLoopStep, updated_at: new Date().toISOString() })
      .eq('id', session.id)
      .then(({ error }) => { if (error) console.error('[learn/ask] Session persist error:', error.message); });
  } catch (err) {
    console.error('[learn/ask] Failed for session ' + session.id + ':', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate a response. Please try again.' });
    } else {
      res.end();
    }
  }
});

// PATCH /api/learn/session/:id/step   { step }
router.patch('/session/:id/step', requireAuth, async (req, res) => {
  const step = parseInt(req.body.step, 10);
  if (Number.isNaN(step) || step < 0 || step > 9) {
    return res.status(400).json({ error: 'step must be an integer between 0 and 9' });
  }

  const { data, error } = await supabase
    .from('learning_sessions')
    .update({ loop_step: step, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error && isMissingSchema(error)) return res.status(501).json({ error: SESSIONS_NOT_SET_UP });
  if (error || !data) return res.status(404).json({ error: 'Session not found' });
  res.json(data);
});

// PATCH /api/learn/session/:id/mode   { mode }
router.patch('/session/:id/mode', requireAuth, async (req, res) => {
  const { mode } = req.body;
  if (!VALID_MODES.includes(mode)) {
    return res.status(400).json({ error: `mode must be one of: ${VALID_MODES.join(', ')}` });
  }

  const { data, error } = await supabase
    .from('learning_sessions')
    .update({ mode, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error && isMissingSchema(error)) return res.status(501).json({ error: SESSIONS_NOT_SET_UP });
  if (error || !data) return res.status(404).json({ error: 'Session not found' });
  res.json(data);
});

// POST /api/learn/session/:id/complete  — auto-generate summary + save as reflection insight
router.post('/session/:id/complete', requireAuth, aiLimiter, async (req, res) => {
  const { data: session, error: sessionError } = await supabase
    .from('learning_sessions')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (sessionError && isMissingSchema(sessionError)) return res.status(501).json({ error: SESSIONS_NOT_SET_UP });
  if (sessionError || !session) return res.status(404).json({ error: 'Session not found' });

  try {
    const summary = await summarizeSession(session.topic, session.mode, session.messages || []);

    if (!summary) return res.json({ insight: null, message: 'Could not generate a summary — session may be too short.' });

    const { data: insight, error: insightError } = await supabase
      .from('insights')
      .insert({
        user_id: req.user.id,
        session_id: session.id,
        content: summary,
        tags: ['session-summary', session.mode, session.topic.slice(0, 40)],
        source_ids: session.source_ids || [],
        insight_type: 'reflection'
      })
      .select()
      .single();

    if (insightError) {
      if (isMissingSchema(insightError)) return res.status(501).json({ error: 'Insights table not set up yet — run migrations_010_memory.sql.' });
      return res.status(500).json({ error: insightError.message });
    }

    // Non-blocking concept extraction + session linking
    setImmediate(async () => {
      try {
        const ms = await import('../services/memoryService.js');
        await ms.processInsightForConcepts(req.user.id, insight);
        await ms.linkSessionConcepts(req.user.id, session.id);
      } catch (_) {}
    });

    res.json({ insight });
  } catch (err) {
    console.error('[learn/complete] Failed:', err.message);
    res.status(500).json({ error: 'Failed to generate session summary.' });
  }
});

// POST /api/learn/session/:id/insight   { content, tags, source_ids, insight_type }
router.post('/session/:id/insight', requireAuth, async (req, res) => {
  const { content, tags, source_ids, insight_type } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'content is required' });

  const { data, error } = await supabase
    .from('insights')
    .insert({
      user_id: req.user.id,
      session_id: req.params.id,
      content: content.trim(),
      tags: tags || [],
      source_ids: source_ids || [],
      insight_type: insight_type || 'observation'
    })
    .select()
    .single();

  if (error) {
    // Migration 010 hasn't been run yet — fail clearly instead of a raw 500
    if (isMissingSchema(error)) {
      return res.status(501).json({ error: 'Insights table not set up yet — run migrations_010_memory.sql in Supabase.' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);

  // Best-effort, non-blocking: pull concepts out of this insight and weave
  // them into the user's concept graph. Never affects the response above.
  setImmediate(() => {
    import('../services/memoryService.js')
      .then(memoryService => memoryService.processInsightForConcepts(req.user.id, data))
      .catch(() => {});
  });
});

// GET /api/learn/concepts — nodes + edges for the Concept Graph UI
router.get('/concepts', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=60');
  try {
    const memoryService = await import('../services/memoryService.js');
    const graph = await memoryService.getConceptGraph(req.user.id);
    res.json(graph);
  } catch (err) {
    if (isMissingSchema(err)) return res.json({ nodes: [], edges: [] });
    res.status(500).json({ error: err.message || 'Failed to load concept graph' });
  }
});

// GET /api/learn/insights?type=&limit=
router.get('/insights', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);

  let q = supabase
    .from('insights')
    .select('id, content, insight_type, tags, source_ids, session_id, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (req.query.type) q = q.eq('insight_type', req.query.type);

  const { data, error } = await q;

  if (error) {
    if (isMissingSchema(error)) return res.json({ insights: [] });
    return res.status(500).json({ error: error.message });
  }

  res.json({ insights: data || [] });
});

// GET /api/learn/recommend — returns up to 4 books from the user's canon
// weighted toward sources used in recent sessions
router.get('/recommend', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  try {
    // Get recent session source_ids
    const { data: sessions } = await supabase
      .from('learning_sessions')
      .select('source_ids')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .limit(5);

    const recentIds = new Set(
      (sessions || []).flatMap(s => s.source_ids || [])
    );

    // Fetch slim books
    const { data: books, error } = await supabase
      .from('books')
      .select('id, title, author, source_type, cover_color, genre, status')
      .eq('user_id', req.user.id)
      .eq('status', 'ready')
      .limit(50);

    if (error) return res.json({ recommendations: [] });

    // Prioritise recently-used sources, then fill with others
    const recent = (books || []).filter(b => recentIds.has(b.id));
    const others = (books || []).filter(b => !recentIds.has(b.id));
    const recommendations = [...recent, ...others].slice(0, 4);

    res.json({ recommendations });
  } catch {
    res.json({ recommendations: [] });
  }
});

export default router;
