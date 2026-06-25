import 'dotenv/config';
import supabase from './supabase.js';
import { retrieveRelevantChunks } from '../services/ragEngine.js';

// Sanity-check script for Part 1 — semantic book chunk retrieval.
// Run after migrations_003_book_embeddings.sql has been applied and at
// least one book has finished uploading (so its chunks have embeddings).
//
//   cd server && node database/testBookRetrieval.js [bookId]
//
// If no bookId is passed, the script picks the most recently created
// 'ready' book automatically. Each query below is deliberately phrased to
// AVOID the book's likely exact wording, so a good result demonstrates
// semantic (meaning-based) matching beating literal full-text search.

const PARAPHRASED_QUERIES = [
  'What does the book say about giving up too early or abandoning something prematurely?',
  'Is there a part about a character making a risky decision under pressure?',
  'Does the book talk about trusting your instincts versus relying on data?',
  'What happens when someone in the story fails publicly or is humiliated?',
  'Is there any discussion of patience paying off over the long run?'
];

async function getDefaultBookId() {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, status')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error('No ready book found. Upload a book first, or pass a bookId argument explicitly.');
    process.exit(1);
  }
  console.log(`Using most recent ready book: "${data.title}" (${data.id})\n`);
  return data.id;
}

async function run() {
  const bookId = process.argv[2] || await getDefaultBookId();

  for (const query of PARAPHRASED_QUERIES) {
    console.log('='.repeat(70));
    console.log(`QUERY: ${query}`);
    console.log('='.repeat(70));
    try {
      const context = await retrieveRelevantChunks(bookId, query, 3);
      console.log(context ? context.slice(0, 600) + (context.length > 600 ? '...\n[truncated]' : '') : '(no chunks returned)');
    } catch (err) {
      console.error('Failed:', err.message);
    }
    console.log('');
  }

  console.log('Done. Look for [ragEngine] warnings above:');
  console.log('  - No warning = semantic search worked (best outcome).');
  console.log('  - "falling back to full-text search" = chunks for this book are not embedded yet');
  console.log('    (either embedding is still running in the background, or this book was');
  console.log('    uploaded before migrations_003_book_embeddings.sql was applied).');
  process.exit(0);
}

run();
