import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { embedText } from '../services/embeddingService.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================
// One-time catch-up backfill for book_chunks.embedding.
//
// New uploads already get embedded automatically in the background
// (see embedBookChunks() in routes/books.js, called right after a book's
// chunks are inserted). But that only works for books uploaded AFTER
// migrations_003_book_embeddings.sql had already been run -- for any
// book uploaded before that column existed, the background embed call
// silently failed (the column didn't exist yet) and was never retried,
// so those chunks are stuck with embedding = NULL forever unless this
// script runs once.
//
// Safe to re-run any time -- it only processes rows where embedding
// IS NULL, same convention as embedChennaiAreas.js.
// ============================================================

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
        console.error(`  X [${i + 1}/${items.length}] chunk ${items[i].chunk_index} (book ${items[i].book_id}): ${err.message}`);
        results[i] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, runner));
  return { results, failures };
}

async function backfill() {
  console.log('Fetching book_chunks rows missing an embedding...');
  const { data: chunks, error } = await supabase
    .from('book_chunks')
    .select('id, book_id, chunk_index, content')
    .is('embedding', null);

  if (error) {
    console.error('Failed to fetch chunks:', error.message);
    console.error('(If this says the column does not exist, run migrations_003_book_embeddings.sql first.)');
    process.exit(1);
  }

  if (!chunks || chunks.length === 0) {
    console.log('Nothing to embed -- every chunk already has an embedding.');
    process.exit(0);
  }

  console.log(`Embedding ${chunks.length} book chunks...`);

  const { results, failures } = await runWithConcurrency(chunks, 5, async (chunk, i) => {
    const vector = await embedText(chunk.content);

    const { error: updateError } = await supabase
      .from('book_chunks')
      .update({ embedding: vector })
      .eq('id', chunk.id);

    if (updateError) throw new Error(updateError.message);
    if ((i + 1) % 25 === 0 || i === chunks.length - 1) {
      console.log(`  OK [${i + 1}/${chunks.length}]`);
    }
    return true;
  });

  const succeeded = results.filter(Boolean).length;
  console.log(`\nEmbedded ${succeeded}/${chunks.length} book chunks (${failures} failed).`);
  if (failures > 0) {
    console.log('Re-run this script -- it only embeds rows where embedding IS NULL, so it is safe to retry.');
  }
  process.exit(failures > 0 ? 1 : 0);
}

backfill();
