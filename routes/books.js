import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../database/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import { processBook, mimeToFileType, mimeToExt } from '../services/bookProcessor.js';
import { chunkText } from '../utils/chunker.js';
import { analyzeBook } from '../services/claudeService.js';
import { embedBatch } from '../services/embeddingService.js';
import { isMissingSchema } from '../utils/schemaErrors.js';
import { enqueueJob } from '../services/jobQueue.js';

const router = express.Router();

// Genre → cover color map
const genreCoverColor = {
  thriller: '#c85250', romance: '#d4547a', psychological: '#7b5ea7',
  comical: '#f5a623', 'self-help': '#2d9b6f', horror: '#6b2737',
  fantasy: '#4a6fa5', historical: '#8b6914', educational: '#2d6a8f',
  biography: '#5a7a4a'
};

/**
 * Embed every chunk of a newly-uploaded book and write the vectors back
 * to book_chunks, so retrieveRelevantChunks() can use semantic search
 * instead of full-text-only matching. Runs as a detached background task
 * (caller does not await this) and never throws — a failure here just
 * means that book's chat falls back to FTS, it never blocks readiness.
 */
async function embedBookChunks(bookId, chunks) {
  try {
    console.log(`[books] Embedding ${chunks.length} chunks for book ${bookId}...`);
    const vectors = await embedBatch(chunks.map(c => c.content));

    let embedded = 0;
    const UPDATE_CONCURRENCY = 5;
    let next = 0;

    async function updateRunner() {
      while (next < chunks.length) {
        const i = next++;
        if (!vectors[i]) continue;
        const { error } = await supabase
          .from('book_chunks')
          .update({ embedding: vectors[i] })
          .eq('book_id', bookId)
          .eq('chunk_index', chunks[i].chunk_index);
        if (!error) embedded++;
        else console.error(`[books] Embedding update failed for chunk ${chunks[i].chunk_index}:`, error.message);
      }
    }

    await Promise.all(Array.from({ length: UPDATE_CONCURRENCY }, updateRunner));
    console.log(`[books] Embedded ${embedded}/${chunks.length} chunks for book ${bookId}.`);
  } catch (err) {
    console.error(`[books] Embedding backfill failed for book ${bookId} (non-fatal — FTS fallback still works):`, err.message);
  }
}

export async function embedBookChunksFromQueue(bookId) {
  await supabase
    .from('books')
    .update({ embedding_status: 'processing' })
    .eq('id', bookId);
  try {
    const { data: chunks, error } = await supabase
      .from('book_chunks')
      .select('chunk_index, content')
      .eq('book_id', bookId)
      .order('chunk_index', { ascending: true });
    if (error || !chunks || chunks.length === 0) throw new Error('No chunks found');
    await embedBookChunks(bookId, chunks);
    await supabase
      .from('books')
      .update({ embedding_status: 'complete' })
      .eq('id', bookId);
  } catch (err) {
    console.error('[books] embedBookChunksFromQueue failed for ' + bookId + ':', err.message);
    await supabase
      .from('books')
      .update({ embedding_status: 'failed' })
      .eq('id', bookId);
    throw err;
  }
}

// POST /api/books/upload
router.post('/upload', requireAuth, uploadSingle, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { buffer, mimetype, originalname } = req.file;
  const userId = req.user.id;
  const fileType = mimeToFileType(mimetype);
  const ext = mimeToExt(mimetype);

  if (!fileType) {
    return res.status(400).json({ error: 'Unsupported file type' });
  }

  // Upload file to Supabase Storage
  const fileId = uuidv4();
  const storagePath = `${userId}/${fileId}.${ext}`;

  const { error: storageError } = await supabase.storage
    .from('books')
    .upload(storagePath, buffer, {
      contentType: mimetype,
      upsert: false
    });

  if (storageError) {
    console.error('[books/upload] Storage error:', storageError.message);
    return res.status(500).json({ error: 'Failed to upload file to storage' });
  }

  // Get public URL (will be private, but stored for reference)
  const { data: { publicUrl } } = supabase.storage.from('books').getPublicUrl(storagePath);

  // Create book record with pending status
  const bookTitle = originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const { data: book, error: dbError } = await supabase
    .from('books')
    .insert({
      user_id: userId,
      title: bookTitle,
      file_url: publicUrl,
      file_type: fileType,
      status: 'processing'
    })
    .select()
    .single();

  if (dbError) {
    console.error('[books/upload] DB error:', dbError.message);
    return res.status(500).json({ error: 'Failed to create book record' });
  }

  // Respond immediately
  res.status(202).json({ bookId: book.id, status: 'processing' });

  // Process in background
  setImmediate(async () => {
    try {
      console.log(`[books] Processing book ${book.id} (${fileType})...`);

      // 1. Extract text
      const { text, wordCount } = await processBook(buffer, fileType);
      console.log(`[books] Extracted ${wordCount} words from book ${book.id}`);

      // 2. Chunk text
      const chunks = chunkText(text, 500, 50);
      console.log(`[books] Created ${chunks.length} chunks for book ${book.id}`);

      // 3. Batch insert chunks (50 at a time)
      const BATCH_SIZE = 50;
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE).map(c => ({
          book_id: book.id,
          chunk_index: c.chunk_index,
          content: c.content,
          chapter_title: c.chapter_title || '',
          chapter_index: c.chapter_index || 0,
          page_estimate: c.page_estimate
        }));

        const { error: chunkError } = await supabase.from('book_chunks').insert(batch);
        if (chunkError) {
          console.error(`[books] Chunk insert error (batch ${i}):`, chunkError.message);
        }
      }

      // 3b. Enqueue embedding job via job queue
      await supabase.from('books').update({ embedding_status: 'pending' }).eq('id', book.id);
      await enqueueJob(userId, 'embed_book', { bookId: book.id, chunkCount: chunks.length });

      // 4. AI Analysis
      console.log(`[books] Starting AI analysis for book ${book.id}...`);
      const analysis = await analyzeBook(text, wordCount);

      const coverColor = genreCoverColor[analysis.genre] || '#1a3a5c';

      // 5. Update book record
      const { error: updateError } = await supabase
        .from('books')
        .update({
          title: analysis.title || bookTitle,
          author: analysis.author || 'Unknown Author',
          genre: analysis.genre || 'educational',
          genre_confidence: analysis.genre_confidence || 0,
          summary: analysis.summary || '',
          tone: analysis.tone || '',
          themes: analysis.themes || [],
          setting: analysis.setting || {},
          characters: analysis.characters || [],
          key_frameworks: analysis.key_frameworks || [],
          business_insights: analysis.business_insights || [],
          key_quotes: analysis.key_quotes || [],
          chapter_breakdown: analysis.chapter_breakdown || [],
          action_items: analysis.action_items || [],
          full_analysis: analysis,
          cover_color: coverColor,
          word_count: wordCount,
          total_chunks: chunks.length,
          status: 'ready',
          updated_at: new Date().toISOString()
        })
        .eq('id', book.id);

      if (updateError) {
        console.error('[books] Update error:', updateError.message);
      } else {
        console.log(`[books] Book ${book.id} processing complete.`);
      }
    } catch (err) {
      console.error(`[books] Processing failed for book ${book.id}:`, err.message);
      await supabase
        .from('books')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', book.id);
    }
  });
});

// GET /api/books
// Library/BookCard only render title, author, genre, status, and source
// badge info — never the full AI analysis blob (summary, themes,
// characters, chapter_breakdown, key_quotes, business_insights,
// action_items, full_analysis). Selecting '*' here was shipping that
// entire JSON payload for every book on every load AND every 3s
// processing-poll, which is what made the library feel slow as books
// accumulated. Full detail is still available via GET /api/books/:id,
// fetched only when a user opens a specific book.
router.get('/', requireAuth, async (req, res) => {
  // ?slim=true  — card-list columns only (LearnHub source selector, Memory Library tab)
  // ?limit=N    — max rows, default 50
  // ?recent=1   — shorthand for limit=1 (last uploaded book)
  const slim = req.query.slim === 'true';
  const limit = req.query.recent === '1' ? 1 : Math.min(parseInt(req.query.limit || '50', 10), 200);

  const cardCols = 'id, title, author, source_type, status, cover_color, genre, created_at';
  const fullCols = 'id, title, author, genre, genre_confidence, cover_color, status, source_type, source_url, tags, word_count, total_chunks, ideal_reader_stage, created_at, updated_at';

  // Short cache: 10 s fresh, serve stale up to 30 s while revalidating.
  // The Library re-fetches on every navigation anyway; this mainly helps
  // rapid page switches and LearnHub loading on the same tab.
  res.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');

  const { data, error } = await supabase
    .from('books')
    .select(slim ? cardCols : fullCols)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!error) return res.json(data || []);

  if (isMissingSchema(error)) {
    console.warn('[books] Learning OS columns not found yet — falling back to baseline columns.');
    const fallback = await supabase
      .from('books')
      .select('id, title, author, genre, genre_confidence, cover_color, status, word_count, total_chunks, created_at, updated_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fallback.error) return res.status(500).json({ error: fallback.error.message });
    return res.json(fallback.data || []);
  }

  res.status(500).json({ error: error.message });
});

// GET /api/books/:id
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Book not found' });
  res.json(data);
});

// GET /api/books/:id/status — SSE polling
router.get('/:id/status', requireAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const bookId = req.params.id;
  const userId = req.user.id;

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const interval = setInterval(async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('id, status, title, genre, cover_color, total_chunks, word_count, embedding_status')
        .eq('id', bookId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        sendEvent({ error: 'Book not found' });
        clearInterval(interval);
        res.end();
        return;
      }

      sendEvent({ status: data.status, bookId: data.id, title: data.title });

      if (data.status === 'ready' || data.status === 'failed') {
        clearInterval(interval);
        res.end();
      }
    } catch (err) {
      console.error('[SSE] Error:', err.message);
      clearInterval(interval);
      res.end();
    }
  }, 2000);

  req.on('close', () => clearInterval(interval));
});

// GET /api/books/:id/chunks
router.get('/:id/chunks', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const size = parseInt(req.query.size || '8', 10);
  const offset = (page - 1) * size;

  // Verify ownership
  const { data: book } = await supabase
    .from('books')
    .select('id, total_chunks')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!book) return res.status(404).json({ error: 'Book not found' });

  const { data, error } = await supabase
    .from('book_chunks')
    .select('chunk_index, content, chapter_title, page_estimate')
    .eq('book_id', req.params.id)
    .order('chunk_index', { ascending: true })
    .range(offset, offset + size - 1);

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    chunks: data || [],
    page,
    size,
    total_chunks: book.total_chunks,
    total_pages: Math.ceil(book.total_chunks / size)
  });
});

// GET /api/books/:id/chapter-search?q=chapter+title+or+keyword&limit=10
router.get('/:id/chapter-search', requireAuth, async (req, res) => {
  const qRaw = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit || '10', 10), 20);

  if (!qRaw) return res.status(400).json({ error: 'Query parameter q is required' });

  // PostgREST's .or() filter syntax uses commas/parens as separators —
  // strip them out of the search term so a stray comma in the user's text
  // can't be misread as a second filter clause.
  const q = qRaw.replace(/[,()]/g, ' ').trim();
  // Also strip parentheticals like "(Chapters 1–8)" that differ between
  // AI-generated chapter_breakdown titles and heading-detected chapter_title strings.
  const qClean = q.replace(/\s*\(.*?\)\s*/g, '').trim();

  // Verify ownership
  const { data: book } = await supabase
    .from('books')
    .select('id, chapter_breakdown')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!book) return res.status(404).json({ error: 'Book not found' });

  // Search chunks by chapter_title (full or cleaned) OR content keyword
  const orFilters = [
    'chapter_title.ilike.%' + q + '%',
    qClean && qClean !== q ? 'chapter_title.ilike.%' + qClean + '%' : null,
    'content.ilike.%' + q.slice(0, 50) + '%'
  ].filter(Boolean).join(',');

  const { data: chunks, error } = await supabase
    .from('book_chunks')
    .select('chunk_index, content, chapter_title, page_estimate')
    .eq('book_id', req.params.id)
    .or(orFilters)
    .order('chunk_index', { ascending: true })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });

  // Find matching chapter from analysis for richer context
  const matchedChapter = (book.chapter_breakdown || []).find(ch =>
    ch.chapter?.toLowerCase().includes(q.toLowerCase())
  );

  res.json({
    chunks: chunks || [],
    matched_chapter: matchedChapter || null,
    query: q
  });
});

// GET /api/books/:id/progress
router.get('/:id/progress', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('reading_progress')
    .select('current_chunk, highlights, notes, bookmarks')
    .eq('user_id', req.user.id)
    .eq('book_id', req.params.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  res.json(data || { current_chunk: 0, highlights: [], notes: [], bookmarks: [] });
});

// PUT /api/books/:id/progress
router.put('/:id/progress', requireAuth, async (req, res) => {
  const { current_chunk, highlights, notes, bookmarks } = req.body;

  const { error } = await supabase
    .from('reading_progress')
    .upsert({
      book_id: req.params.id,
      user_id: req.user.id,
      current_chunk: current_chunk ?? 0,
      highlights: highlights || [],
      notes: notes || [],
      bookmarks: bookmarks || [],
      updated_at: new Date().toISOString()
    }, { onConflict: 'book_id,user_id' });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
