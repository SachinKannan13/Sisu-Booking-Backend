import fetch from 'node-fetch';

// OpenRouter embeddings endpoint — OpenAI-compatible. Shared by every
// feature that needs text embeddings (Chennai locations, book chunks, etc.)
// so the fetch/auth/model logic lives in exactly one place.
const OPENROUTER_EMBEDDINGS_URL = 'https://openrouter.ai/api/v1/embeddings';
const EMBEDDING_MODEL = process.env.OPENROUTER_EMBEDDING_MODEL || 'openai/text-embedding-3-small';

function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
    'X-Title': 'BookSphere'
  };
}

/**
 * Embed a single piece of text via OpenRouter.
 * @param {string} text
 * @returns {Promise<number[]>} 1536-dimension embedding vector
 */
export async function embedText(text) {
  const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter embeddings error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const vector = data.data?.[0]?.embedding;
  if (!vector) throw new Error('OpenRouter returned no embedding vector');
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
