import supabase from '../database/supabase.js';

/**
 * Continuous learning memory — insights, concept graph, and the compact
 * "YOUR LEARNING JOURNEY" string injected into learning-mode prompts so
 * the AI has continuity across sessions instead of starting fresh every
 * time. Every function here is best-effort: if Migration 010 hasn't been
 * run yet, callers should catch and proceed without memory rather than
 * crash (see routes/learn.js's dynamic import pattern).
 */

export async function saveInsight(userId, { content, tags, sourceIds, sessionId, insightType }) {
  const { data, error } = await supabase
    .from('insights')
    .insert({
      user_id: userId,
      session_id: sessionId || null,
      source_ids: sourceIds || [],
      content,
      tags: tags || [],
      insight_type: insightType || 'observation'
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getInsights(userId, type = null) {
  let q = supabase
    .from('insights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (type) q = q.eq('insight_type', type);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Insert a new concept node, or — if a node with the same label already
 * exists for this user (case-insensitive match) — merge the new
 * source_ids/insight_ids into the existing row instead of duplicating it.
 */
export async function upsertConceptNode(userId, { label, description, sourceIds, insightIds }) {
  const { data: existing, error: findError } = await supabase
    .from('concept_nodes')
    .select('*')
    .eq('user_id', userId)
    .ilike('label', label)
    .limit(1);

  if (findError) throw new Error(findError.message);

  if (existing && existing.length > 0) {
    const node = existing[0];
    const mergedSourceIds = Array.from(new Set([...(node.source_ids || []), ...(sourceIds || [])]));
    const mergedInsightIds = Array.from(new Set([...(node.insight_ids || []), ...(insightIds || [])]));

    const { data: updated, error: updateError } = await supabase
      .from('concept_nodes')
      .update({
        source_ids: mergedSourceIds,
        insight_ids: mergedInsightIds,
        description: description || node.description,
        session_count: (node.session_count || 1) + 1
      })
      .eq('id', node.id)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);
    return updated;
  }

  const { data: created, error: insertError } = await supabase
    .from('concept_nodes')
    .insert({
      user_id: userId,
      label,
      description: description || '',
      source_ids: sourceIds || [],
      insight_ids: insightIds || []
    })
    .select()
    .single();

  if (insertError) throw new Error(insertError.message);
  return created;
}

export async function getConceptNodes(userId) {
  const { data, error } = await supabase
    .from('concept_nodes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getConceptEdges(userId) {
  const { data, error } = await supabase
    .from('concept_edges')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Connects every pair of concept node ids that co-occurred in the same
 * insight with a 'co-occurs' edge, skipping any pair that's already
 * linked (checked in both directions, since edges are directional rows
 * but the relationship itself is symmetric for this use case).
 */
export async function linkConceptsPairwise(userId, nodeIds, relationship = 'co-occurs') {
  const ids = Array.from(new Set((nodeIds || []).filter(Boolean)));
  if (ids.length < 2) return [];

  const { data: existing, error: findError } = await supabase
    .from('concept_edges')
    .select('from_id, to_id')
    .eq('user_id', userId)
    .or(ids.map(id => `from_id.eq.${id},to_id.eq.${id}`).join(','));

  if (findError) throw new Error(findError.message);

  const existingPairs = new Set(
    (existing || []).map(e => [e.from_id, e.to_id].sort().join('::'))
  );

  const toInsert = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = [ids[i], ids[j]].sort().join('::');
      if (existingPairs.has(key)) continue;
      existingPairs.add(key);
      toInsert.push({ user_id: userId, from_id: ids[i], to_id: ids[j], relationship });
    }
  }
  if (toInsert.length === 0) return [];

  const { data: created, error: insertError } = await supabase
    .from('concept_edges')
    .insert(toInsert)
    .select();

  if (insertError) throw new Error(insertError.message);
  return created || [];
}

/**
 * Best-effort pipeline: extract concept labels from a freshly-saved
 * insight, upsert each as a concept node, then link them together.
 * Designed to be called via setImmediate() right after an insight save
 * so it never adds latency to the user-facing request — any failure here
 * (including Migration 010 not being run yet) is swallowed and logged.
 */
export async function processInsightForConcepts(userId, insight) {
  try {
    const { extractConcepts } = await import('./claudeService.js');
    const concepts = await extractConcepts(insight.content);
    if (concepts.length === 0) return;

    const nodes = [];
    for (const c of concepts) {
      const node = await upsertConceptNode(userId, {
        label: c.label,
        description: c.description,
        sourceIds: insight.source_ids,
        insightIds: [insight.id]
      });
      nodes.push(node);
    }

    if (nodes.length > 1) {
      await linkConceptsPairwise(userId, nodes.map(n => n.id));
    }
  } catch (err) {
    console.warn('[processInsightForConcepts] Skipped concept linking:', err.message);
  }
}

/** Convenience bundle for the Concept Graph UI. */
export async function getConceptGraph(userId) {
  const [nodes, edges] = await Promise.all([getConceptNodes(userId), getConceptEdges(userId)]);
  return { nodes, edges };
}

const MAX_CONTEXT_CHARS = 8000;

export async function getUserLearningContext(userId) {
  const [insightsRes, experimentsRes, conceptsRes] = await Promise.allSettled([
    supabase
      .from('insights')
      .select('content, insight_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('experiments')
      .select('title, hypothesis, status')
      .eq('user_id', userId)
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('concept_nodes')
      .select('label')
      .eq('user_id', userId)
      .order('session_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(15)
  ]);
  const insights    = insightsRes.status    === 'fulfilled' && !insightsRes.value.error    ? insightsRes.value.data    || [] : [];
  const experiments = experimentsRes.status === 'fulfilled' && !experimentsRes.value.error ? experimentsRes.value.data || [] : [];
  const concepts    = conceptsRes.status    === 'fulfilled' && !conceptsRes.value.error    ? conceptsRes.value.data    || [] : [];
  if (!insights.length && !experiments.length && !concepts.length) return '';
  const header   = "YOUR LEARNING JOURNEY (use this for continuity — don't repeat what's already known):";
  const expLines = experiments.length > 0
    ? ['Currently running experiments:', ...experiments.map(e => '  - ' + e.title + (e.hypothesis ? ': ' + e.hypothesis : ''))]
    : [];
  const concLine = concepts.length > 0
    ? ['Concepts already explored: ' + concepts.slice(0, 10).map(c => c.label).join(', ')]
    : [];
  let insightLines = insights.map(i => '  - [' + i.insight_type + '] ' + i.content);
  const insightHeader = insights.length > 0 ? ['Recent insights:'] : [];
  while (insightLines.length > 0) {
    const full = [header, ...insightHeader, ...insightLines, ...expLines, ...concLine].join('\n');
    if (full.length <= MAX_CONTEXT_CHARS) break;
    insightLines.pop();
  }
  const finalLines = [header, ...insightHeader, ...insightLines, ...expLines, ...concLine];
  const result = finalLines.join('\n');
  return result.length > MAX_CONTEXT_CHARS
    ? result.slice(0, MAX_CONTEXT_CHARS) + '\n[...context trimmed for length]'
    : result;
}

export async function linkSessionConcepts(userId, sessionId) {
  try {
    const { data: insights, error: insightError } = await supabase
      .from('insights')
      .select('id')
      .eq('user_id', userId)
      .eq('session_id', sessionId);
    if (insightError || !insights || insights.length === 0) return;
    const insightIds = insights.map(i => i.id);
    const { data: nodes, error: nodeError } = await supabase
      .from('concept_nodes')
      .select('id, label')
      .eq('user_id', userId)
      .overlaps('insight_ids', insightIds);
    if (nodeError || !nodes || nodes.length < 2) return;
    await linkConceptsPairwise(userId, nodes.map(n => n.id), 'session-co-occurs');
    console.log('[memoryService] Linked ' + nodes.length + ' concepts from session ' + sessionId);
  } catch (err) {
    console.warn('[linkSessionConcepts] Skipped:', err.message);
  }
}
