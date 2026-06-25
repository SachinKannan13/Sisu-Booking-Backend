import supabase from '../database/supabase.js';
import { embedText } from './embeddingService.js';

/**
 * Retrieve relevant book chunks for a query using the same three-tier
 * pattern proven in chennaiEngine.js:
 *   1. Semantic search via match_book_chunks() (pgvector cosine similarity)
 *   2. Full-text search (existing tsvector implementation)
 *   3. Sequential chunks (first N, so the chat never has zero context)
 *
 * Signature is unchanged so routes/chat.js doesn't need to change.
 *
 * @param {string} bookId
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<string>} - Joined chunk contents
 */
export async function retrieveRelevantChunks(bookId, query, limit = 5) {
  // ── Tier 1: semantic search ──────────────────────────────────────
  try {
    const semanticChunks = await semanticSearch(bookId, query, limit);
    if (semanticChunks && semanticChunks.length > 0) {
      return formatChunks(semanticChunks);
    }
    throw new Error('Semantic search returned no rows (chunks may not be embedded yet)');
  } catch (err) {
    console.warn(`[ragEngine] Semantic search unavailable for book ${bookId} (${err.message}) — falling back to full-text search.`);
  }

  // ── Tier 2: full-text search ──────────────────────────────────────
  try {
    const { data: ftsResults, error: ftsError } = await supabase
      .from('book_chunks')
      .select('content, chunk_index, chapter_title')
      .eq('book_id', bookId)
      .textSearch('tsv', query, { type: 'plain', config: 'english' })
      .order('chunk_index', { ascending: true })
      .limit(limit);

    if (!ftsError && ftsResults && ftsResults.length > 0) {
      return formatChunks(ftsResults);
    }
  } catch (err) {
    console.error('[ragEngine] Full-text search error:', err.message);
  }

  // ── Tier 3: sequential fallback — always returns something ──────
  try {
    const { data: fallback, error: fallbackError } = await supabase
      .from('book_chunks')
      .select('content, chunk_index, chapter_title')
      .eq('book_id', bookId)
      .order('chunk_index', { ascending: true })
      .limit(limit);

    if (fallbackError) {
      console.error('[ragEngine] Fallback error:', fallbackError.message);
      return '';
    }

    return formatChunks(fallback || []);
  } catch (err) {
    console.error('[ragEngine] Error retrieving chunks:', err.message);
    return '';
  }
}

/**
 * Embed the query and call the match_book_chunks() Postgres function
 * for cosine-similarity nearest neighbors within a single book.
 */
async function semanticSearch(bookId, query, matchCount) {
  const queryEmbedding = await embedText(query);

  const { data, error } = await supabase.rpc('match_book_chunks', {
    query_embedding: queryEmbedding,
    filter_book_id: bookId,
    match_count: matchCount
  });

  if (error) throw new Error(error.message);
  return data || [];
}

function formatChunks(chunks) {
  return chunks.map(c => c.content).join('\n---\n');
}

// ============================================================
// Learning OS additions — cross-source-knowledge-base retrieval.
// retrieveRelevantChunks() above (single-book chat) is untouched.
// ============================================================

const MAX_CHUNKS_PER_SOURCE = 4;
const RRF_K = 60;

/**
 * Retrieve relevant chunks across every source in a user's knowledge
 * base using Reciprocal Rank Fusion (RRF) of semantic + FTS results,
 * with a sequential fallback if both fail.
 *
 * @param {string} userId
 * @param {string} query
 * @param {number} limit
 * @param {string[]|null} filterSourceIds
 * @returns {Promise<Array>}
 */
export async function retrieveAcrossKB(userId, query, limit = 10, filterSourceIds = null) {
  try {
    return await retrieveWithRRF(userId, query, limit, filterSourceIds);
  } catch (err) {
    console.warn(`[ragEngine] RRF retrieval failed (${err.message}) — falling back to sequential.`);
  }
  return await retrieveSequential(userId, query, limit, filterSourceIds);
}

async function retrieveWithRRF(userId, query, limit, filterSourceIds) {
  const [semanticResult, ftsResult] = await Promise.allSettled([
    runSemanticSearch(userId, query, limit * 3, filterSourceIds),
    runFTSSearch(userId, query, limit * 3, filterSourceIds)
  ]);
  const semanticRows = semanticResult.status === 'fulfilled' ? (semanticResult.value || []) : [];
  const ftsRows      = ftsResult.status      === 'fulfilled' ? (ftsResult.value      || []) : [];
  if (semanticRows.length === 0 && ftsRows.length === 0) {
    throw new Error('Both semantic and FTS searches returned no results');
  }
  const semanticRank = new Map(semanticRows.map((r, i) => [r.id, i + 1]));
  const ftsRank      = new Map(ftsRows.map((r, i) => [r.id, i + 1]));
  const allIds = new Set([...semanticRows.map(r => r.id), ...ftsRows.map(r => r.id)]);
  const rowById = new Map();
  for (const r of [...semanticRows, ...ftsRows]) {
    if (!rowById.has(r.id)) rowById.set(r.id, r);
  }
  const scored = Array.from(allIds).map(id => {
    const sRank = semanticRank.get(id) ?? null;
    const fRank = ftsRank.get(id) ?? null;
    const score =
      (sRank ? 1.0 / (RRF_K + sRank) : 0) +
      (fRank ? 1.0 / (RRF_K + fRank) : 0);
    return { ...rowById.get(id), rrf_score: score };
  });
  scored.sort((a, b) => b.rrf_score - a.rrf_score);
  return capPerSource(scored, limit);
}

async function runSemanticSearch(userId, query, limit, filterSourceIds) {
  const queryEmbedding = await embedText(query);
  const { data, error } = await supabase.rpc('match_kb_chunks', {
    query_embedding:   queryEmbedding,
    filter_user_id:    userId,
    match_count:       limit,
    filter_source_ids: filterSourceIds && filterSourceIds.length ? filterSourceIds : null
  });
  if (error) throw new Error(error.message);
  return data || [];
}

async function runFTSSearch(userId, query, limit, filterSourceIds) {
  let q = supabase
    .from('book_chunks')
    .select('id, book_id, chunk_index, content, chapter_title, chapter_index, source_author, source_title, source_type, section_label, page_estimate, books!inner(user_id)')
    .eq('books.user_id', userId)
    .textSearch('tsv', query, { type: 'plain', config: 'english' })
    .limit(limit);
  if (filterSourceIds && filterSourceIds.length) {
    q = q.in('book_id', filterSourceIds);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

async function retrieveSequential(userId, query, limit, filterSourceIds) {
  try {
    const rows = await runSemanticSearch(userId, query, limit * 3, filterSourceIds);
    if (rows.length > 0) return capPerSource(rows, limit);
    throw new Error('no semantic results');
  } catch (err) {
    console.warn(`[ragEngine] Sequential semantic failed: ${err.message}`);
  }
  try {
    const rows = await runFTSSearch(userId, query, limit * 3, filterSourceIds);
    if (rows.length > 0) return capPerSource(rows, limit);
  } catch (err) {
    console.error('[ragEngine] Sequential FTS failed:', err.message);
  }
  try {
    let q = supabase
      .from('book_chunks')
      .select('id, book_id, chunk_index, content, chapter_title, chapter_index, source_author, source_title, source_type, section_label, page_estimate, books!inner(user_id)')
      .eq('books.user_id', userId)
      .order('chunk_index', { ascending: true })
      .limit(limit * 3);
    if (filterSourceIds && filterSourceIds.length) q = q.in('book_id', filterSourceIds);
    const { data } = await q;
    return capPerSource(data || [], limit);
  } catch (err) {
    console.error('[ragEngine] Sequential fallback failed:', err.message);
    return [];
  }
}

/**
 * Cap the number of chunks taken from any single source so a giant
 * book can't crowd out smaller sources, then trim to the overall limit.
 */
function capPerSource(rows, limit) {
  const perSourceCount = {};
  const capped = [];
  for (const row of rows) {
    const key = row.book_id;
    perSourceCount[key] = (perSourceCount[key] || 0) + 1;
    if (perSourceCount[key] <= MAX_CHUNKS_PER_SOURCE) capped.push(row);
    if (capped.length >= limit) break;
  }
  return capped;
}

/**
 * Format cross-KB chunks with full attribution for prompt injection, e.g.:
 *   [Cal Newport, "Deep Work", Chapter 3]
 *   <chunk content>
 *   ---
 *   [Jane Doe, "Interview Transcript", SPEAKER A]
 *   <chunk content>
 */
export function formatChunksWithAttribution(chunks) {
  return (chunks || [])
    .map(c => {
      const author = c.source_author || 'Unknown Author';
      const title = c.source_title || 'Untitled Source';
      const section = c.section_label || c.chapter_title || '';
      const label = section
        ? `[${author}, "${title}", ${section}]`
        : `[${author}, "${title}"]`;
      return `${label}\n${c.content}`;
    })
    .join('\n---\n');
}
