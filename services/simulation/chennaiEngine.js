// Uses the shared, fixed embeddingService — not its own inline embedder.
import { embedText } from '../embeddingService.js';
import supabase from '../../database/supabase.js';

/**
 * Get Chennai location context relevant to a storytelling scenario.
 * Primary path: embedding-based semantic similarity via pgvector
 * (match_chennai_areas RPC, see migrations_002_chennai_deep.sql).
 * Falls back to the original tag/keyword search if embeddings,
 * the RPC function, or the OpenRouter call are unavailable —
 * so this never hard-fails story generation.
 *
 * @param {string} scenario - Description of the user's situation/challenge
 * @param {string} area - Specific Chennai area preference (optional)
 * @returns {Promise<string>} - Formatted string of relevant locations
 */
export async function getChennaiContext(scenario, area = '') {
  let results = [];

  // A specific requested area always gets a guaranteed slot, regardless
  // of which retrieval path (semantic or fallback) ends up running.
  if (area && area.trim()) {
    try {
      const { data: areaData } = await supabase
        .from('chennai_areas')
        .select('*')
        .ilike('name', `%${area.trim()}%`)
        .limit(3);
      if (areaData && areaData.length > 0) results = areaData;
    } catch (_) { /* non-fatal — semantic/fallback search below still runs */ }
  }

  // ── Primary: semantic retrieval via pgvector ──────────────────────
  try {
    const semantic = await semanticSearch(scenario, 8);
    if (semantic && semantic.length > 0) {
      mergeUnique(results, semantic);
    } else {
      throw new Error('Semantic search returned no rows (embeddings likely not backfilled yet)');
    }
  } catch (err) {
    console.warn(`[chennaiEngine] Semantic search unavailable (${err.message}) — falling back to keyword search.`);
    try {
      const fallback = await keywordFallbackSearch(scenario);
      mergeUnique(results, fallback);
    } catch (fallbackErr) {
      console.error('[chennaiEngine] Keyword fallback also failed:', fallbackErr.message);
    }
  }

  // ── Last resort: just return something so story generation never breaks ──
  if (results.length === 0) {
    try {
      const { data: fallback } = await supabase.from('chennai_areas').select('*').limit(8);
      results = fallback || [];
    } catch (err) {
      console.error('[chennaiEngine] Final fallback query failed:', err.message);
      return 'Chennai, Tamil Nadu, India — a vibrant city of innovation and tradition.';
    }
  }

  return formatChennaiContext(results.slice(0, 8));
}

/**
 * Embed the scenario text and call the match_chennai_areas() Postgres
 * function for cosine-similarity nearest neighbors.
 */
async function semanticSearch(scenario, matchCount) {
  const queryEmbedding = await embedText(scenario || 'a startup founder facing a challenge in Chennai');

  const { data, error } = await supabase.rpc('match_chennai_areas', {
    query_embedding: queryEmbedding,
    match_count: matchCount
  });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Original tag/keyword-overlap search — kept as the graceful fallback
 * for when pgvector hasn't been migrated yet, embeddings haven't been
 * backfilled, or the OpenRouter embeddings call fails for any reason.
 */
async function keywordFallbackSearch(scenario) {
  const results = [];
  const keywords = extractKeywords(scenario);

  if (keywords.length > 0) {
    const { data: tagged } = await supabase
      .from('chennai_areas')
      .select('*')
      .overlaps('tags', keywords)
      .limit(6);
    if (tagged) mergeUnique(results, tagged);
  }

  if (results.length < 5) {
    const searchTerm = keywords[0] || 'startup';
    const { data: descSearch } = await supabase
      .from('chennai_areas')
      .select('*')
      .or(`description.ilike.%${searchTerm}%,storytelling_notes.ilike.%${searchTerm}%`)
      .limit(5);
    if (descSearch) mergeUnique(results, descSearch);
  }

  return results;
}

function mergeUnique(target, incoming) {
  const existingIds = new Set(target.map(r => r.id));
  for (const item of incoming) {
    if (!existingIds.has(item.id)) {
      target.push(item);
      existingIds.add(item.id);
    }
  }
  return target;
}

function extractKeywords(scenario) {
  const words = scenario.toLowerCase().split(/\s+/);
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'i', 'my', 'me', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
    'them', 'their', 'this', 'that', 'these', 'those', 'and', 'or', 'but',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
    'out', 'off', 'over', 'under', 'again', 'then', 'once', 'very', 'just'
  ]);

  const domainMap = {
    startup: ['startup', 'business', 'entrepreneurial'],
    founder: ['startup', 'business'],
    tech: ['it', 'tech', 'startup'],
    software: ['it', 'tech'],
    product: ['startup', 'it'],
    investor: ['startup', 'business', 'premium'],
    funding: ['startup', 'business'],
    growth: ['startup', 'growth', 'it'],
    team: ['startup', 'corporate'],
    cafe: ['cafe', 'creative'],
    coffee: ['cafe', 'creative'],
    meeting: ['cafe', 'business', 'meetings'],
    peaceful: ['peaceful', 'quiet'],
    beach: ['beach'],
    creative: ['creative', 'cafe'],
    culture: ['cultural', 'traditional'],
    heritage: ['historic', 'cultural'],
    mentor: ['intellectual', 'wisdom'],
    wisdom: ['wisdom', 'intellectual']
  };

  const tags = [];
  words.forEach(word => {
    const clean = word.replace(/[^a-z]/g, '');
    if (!stopWords.has(clean) && clean.length > 3) {
      if (domainMap[clean]) {
        tags.push(...domainMap[clean]);
      } else {
        tags.push(clean);
      }
    }
  });

  return [...new Set(tags)].slice(0, 5);
}

/**
 * Map the current calendar month to Chennai's actual seasonal rhythm.
 * Chennai gets the bulk of its rain Oct-Nov (northeast/retreating monsoon),
 * not Jun-Sep like most of India — this keeps story prose accurate to that.
 */
function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1-12
  if (month === 1 || month === 2) return 'jan_feb';
  if (month >= 3 && month <= 5) return 'mar_may';
  if (month >= 6 && month <= 9) return 'jun_sep';
  if (month === 10 || month === 11) return 'oct_nov';
  return 'dec';
}

function formatChennaiContext(areas) {
  if (!areas || areas.length === 0) return '';
  const season = getCurrentSeason();

  return areas.map(area => {
    const lines = [
      `📍 ${area.name} (${area.area_type})`,
      `   ${area.description}`,
      `   Storytelling note: ${area.storytelling_notes || 'A key Chennai location.'}`,
      `   Coordinates: ${area.lat}, ${area.lng}`
    ];

    if (area.time_context && Object.keys(area.time_context).length > 0) {
      const tc = Object.entries(area.time_context)
        .map(([period, desc]) => `${period}: ${desc}`)
        .join(' | ');
      lines.push(`   Time-of-day character: ${tc}`);
    }

    // Add seasonal context if available (requires migrations_006_chennai_depth.sql
    // and seedChennaiSeasonal.js to have been run — degrades gracefully if not).
    if (area.seasonal_context && area.seasonal_context[season]) {
      lines.push(`   Current season feel (${season.replace('_', '/')}): ${area.seasonal_context[season]}`);
    }

    if (area.micro_locations && area.micro_locations.length > 0) {
      const micro = area.micro_locations.map(m => m.name).join(', ');
      lines.push(`   Specific spots: ${micro}`);
    }

    return lines.join('\n');
  }).join('\n\n');
}
