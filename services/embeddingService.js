import fetch from 'node-fetch';

// ── Embedding provider configuration ──────────────────────────────────────────
// Priority order (first match wins):
//   1. EMBEDDINGS_URL / EMBEDDINGS_API_KEY / EMBEDDINGS_MODEL  — explicit override
//   2. OPENROUTER_API_KEY  — uses OpenRouter's OpenAI-compatible embeddings endpoint
//   3. OPENAI_API_KEY      — direct OpenAI
// Model defaults to OPENROUTER_EMBEDDING_MODEL → 'text-embedding-3-small'
// Vector dims: text-embedding-3-small = 1536 (matches pgvector column in migrations_003)
// ──────────────────────────────────────────────────────────────────────────────
const _useOpenRouter = !process.env.EMBEDDINGS_URL && !process.env.EMBEDDINGS_API_KEY && !!process.env.OPENROUTER_API_KEY;

const EMBEDDINGS_URL  = process.env.EMBEDDINGS_URL
  || (_useOpenRouter ? 'https://openrouter.ai/api/v1/embeddings' : 'https://api.openai.com/v1/embeddings');

const EMBEDDING_MODEL = process.env.EMBEDDINGS_MODEL
  || process.env.OPENROUTER_EMBEDDING_MODEL
  || 'text-embedding-3-small';

function getApiKey() {
  const key = process.env.EMBEDDINGS_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('[embeddingService] No API key — set OPENROUTER_API_KEY (or EMBEDDINGS_API_KEY / OPENAI_API_KEY) in .env');
  return key;
}

function getHeaders() {
  return {
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Embed a single piece of text.
 * Returns a 1536-dimension vector (text-embedding-3-small default).
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedText(text) {
  const response = await fetch(EMBEDDINGS_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embeddings API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const vector = data.data?.[0]?.embedding;
  if (!vector) throw new Error('Embeddings API returned no embedding vector');
  return vector;
}

/**
 * Embed many texts with a bounded number of concurrent requests.
 * Never throws — a failed item comes back as `null` in the results array
 * so one bad chunk can't take down a whole batch.
 * @param {string[]} texts
 * @param {number} concurrency
 * @returns {Promise<(number[]|null)[]>}
 */
export async function embedBatch(texts, concurrency = 5) {
  const results = new Array(texts.length);
  let next = 0;

  async function runner() {
    while (next < texts.length) {
      const i = next++;
      try {
        results[i] = await embedText(texts[i]);
      } catch (err) {
        results[i] = null;
        console.error(`[embeddingService] item ${i} failed:`, err.message);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, runner));
  return results;
}

/**
 * Boot healthcheck — embeds the string "healthcheck" once to verify the
 * provider is reachable and returning valid vectors. Call once on startup.
 * Logs a clear warning (but does not crash) on failure so the server still
 * boots and serves keyword-search results while the operator fixes the key.
 */
export async function embeddingHealthcheck() {
  try {
    const vec = await embedText('healthcheck');
    if (!Array.isArray(vec) || vec.length === 0) throw new Error('Empty vector returned');
    console.log(`[embeddingService] ✓ Healthcheck passed — model: ${EMBEDDING_MODEL}, dims: ${vec.length}, url: ${EMBEDDINGS_URL}`);
    return true;
  } catch (err) {
    console.warn(`[embeddingService] ✗ EMBEDDING HEALTHCHECK FAILED: ${err.message}`);
    console.warn('[embeddingService]   Semantic search will be unavailable. Set OPENROUTER_API_KEY (or EMBEDDINGS_API_KEY / OPENAI_API_KEY) in server/.env');
    return false;
  }
}
