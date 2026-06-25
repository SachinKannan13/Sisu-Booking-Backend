import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { embedText } from '../services/embeddingService.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const EMBEDDING_MODEL = process.env.OPENROUTER_EMBEDDING_MODEL || 'openai/text-embedding-3-small';

// Small concurrency-limited batch runner so we don't hammer the API.
// (Kept local rather than using embeddingService's embedBatch() because
// this script also needs to do a Supabase update per item, not just embed.)
async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  let failures = 0;

  async function runner() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        failures++;
        console.error(`  X [${i + 1}/${items.length}] ${items[i].name}: ${err.message}`);
        results[i] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, runner));
  return { results, failures };
}

async function backfill() {
  console.log('Fetching chennai_areas rows...');
  const { data: areas, error } = await supabase
    .from('chennai_areas')
    .select('id, name, description, storytelling_notes')
    .is('embedding', null);

  if (error) {
    console.error('Failed to fetch areas:', error.message);
    process.exit(1);
  }

  if (!areas || areas.length === 0) {
    console.log('Nothing to embed -- every row already has an embedding.');
    process.exit(0);
  }

  console.log(`Embedding ${areas.length} locations via ${EMBEDDING_MODEL}...`);

  const { results, failures } = await runWithConcurrency(areas, 5, async (area, i) => {
    const text = `${area.name}. ${area.description || ''} ${area.storytelling_notes || ''}`.trim();
    const vector = await embedText(text);

    const { error: updateError } = await supabase
      .from('chennai_areas')
      .update({ embedding: vector })
      .eq('id', area.id);

    if (updateError) throw new Error(updateError.message);
    console.log(`  OK [${i + 1}/${areas.length}] ${area.name}`);
    return true;
  });

  const succeeded = results.filter(Boolean).length;
  console.log(`\nEmbedded ${succeeded}/${areas.length} locations (${failures} failed).`);
  if (failures > 0) {
    console.log('Re-run this script -- it only embeds rows where embedding IS NULL, so it is safe to retry.');
  }
  process.exit(failures > 0 ? 1 : 0);
}

backfill();
