import express from 'express';
import supabase from '../database/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { processText, processTranscript, buildChunkMetadata } from '../services/bookProcessor.js';
import { chunkText } from '../utils/chunker.js';
import { analyzeBook } from '../services/claudeService.js';
import { embedBatch } from '../services/embeddingService.js';
import { ingestURL } from '../services/urlIngester.js';
import { isMissingSchema } from '../utils/schemaErrors.js';

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

const genreCoverColor = {
  thriller: '#c85250', romance: '#d4547a', psychological: '#7b5ea7',
  comical: '#f5a623', 'self-help': '#2d9b6f', horror: '#6b2737',
  fantasy: '#4a6fa5', historical: '#8b6914', educational: '#2d6a8f',
  biography: '#5a7a4a'
};

/**
 * Shared ingestion path for every non-file source type (URL, pasted
 * text, transcript, note, etc.). Creates the `books` row immediately
 * (status: 'processing') and returns it, then chunks + embeds + runs
 * AI analysis in the background via setImmediate() so the HTTP
 * response never blocks on a slow AI call.
 *
 * @param {string} userId
 * @param {{title:string, author:string, text:string, wordCount:number,
 *           source_type:string, source_url?:string, tags?:string[]}} payload
 */
async function saveSourceToKB(userId, payload) {
  const { title, author, text, wordCount, source_type, source_url, tags } = payload;

  const { data: source, error: dbError } = await supabase
    .from('books')
    .insert({
      user_id: userId,
      title: title || 'Untitled Source',
      author: author || '',
      source_type: source_type || 'note',
      source_url: source_url || null,
      tags: tags || [],
      word_count: wordCount || 0,
      status: 'processing'
    })
    .select()
    .single();

  if (dbError) {
    if (isMissingSchema(dbError)) {
      throw new Error('Multi-source knowledge base is not set up yet — run migrations_007_knowledge_canon.sql in the Supabase SQL editor, then try again.');
    }
    throw new Error(dbError.message);
  }

  setImmediate(async () => {
    try {
      console.log(`[sources] Processing ${source_type} source ${source.id}...`);

      const chunks = chunkText(text, 500, 50);
      const meta = buildChunkMetadata(source_type, author, title);

      const BATCH_SIZE = 50;
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE).map(c => ({
          book_id: source.id,
          chunk_index: c.chunk_index,
          content: c.content,
          chapter_title: c.chapter_title || '',
          chapter_index: c.chapter_index || 0,
          page_estimate: c.page_estimate,
          source_author: meta.source_author,
          source_title: meta.source_title,
          source_type: meta.source_type,
          section_label: ''
        }));

        const { error: chunkError } = await supabase.from('book_chunks').insert(batch);
        if (chunkError) {
          console.error(`[sources] Chunk insert error (batch ${i}):`, chunkError.message);
        }
      }

      // Embed chunks for semantic retrieval (best-effort, non-blocking on failure)
      try {
        const vectors = await embedBatch(chunks.map(c => c.content));
        const UPDATE_CONCURRENCY = 5;
        let next = 0;
        async function updateRunner() {
          while (next < chunks.length) {
            const i = next++;
            if (!vectors[i]) continue;
            const { error } = await supabase
              .from('book_chunks')
              .update({ embedding: vectors[i] })
              .eq('book_id', source.id)
              .eq('chunk_index', chunks[i].chunk_index);
            if (error) console.error(`[sources] Embedding update failed for chunk ${chunks[i].chunk_index}:`, error.message);
          }
        }
        await Promise.all(Array.from({ length: UPDATE_CONCURRENCY }, updateRunner));
      } catch (embedErr) {
        console.error(`[sources] Embedding backfill failed for source ${source.id} (non-fatal):`, embedErr.message);
      }

      // AI analysis — reuse the same enrichment used for uploaded books
      // (genre/summary/themes/etc) so this source behaves identically in
      // the Library and in cross-KB retrieval attribution.
      let analysis = {};
      try {
        analysis = await analyzeBook(text, wordCount || chunks.length * 500);
      } catch (analysisErr) {
        console.error(`[sources] AI analysis failed for source ${source.id} (continuing without it):`, analysisErr.message);
      }

      const coverColor = genreCoverColor[analysis.genre] || '#2d6a8f';

      const { error: updateError } = await supabase
        .from('books')
        .update({
          title: title || analysis.title || 'Untitled Source',
          author: author || analysis.author || '',
          genre: analysis.genre || 'educational',
          genre_confidence: analysis.genre_confidence || 0,
          summary: analysis.summary || '',
          tone: analysis.tone || '',
          themes: analysis.themes || [],
          key_frameworks: analysis.key_frameworks || [],
          business_insights: analysis.business_insights || [],
          key_quotes: analysis.key_quotes || [],
          full_analysis: analysis,
          cover_color: coverColor,
          word_count: wordCount || 0,
          total_chunks: chunks.length,
          status: 'ready',
          updated_at: new Date().toISOString()
        })
        .eq('id', source.id);

      if (updateError) {
        console.error(`[sources] Final update error for source ${source.id}:`, updateError.message);
      } else {
        console.log(`[sources] Source ${source.id} (${source_type}) ready.`);
      }
    } catch (err) {
      console.error(`[sources] Processing failed for source ${source.id}:`, err.message);
      await supabase
        .from('books')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', source.id);
    }
  });

  return source;
}

// POST /api/sources/ingest-url   { url, tags }
router.post('/ingest-url', requireAuth, async (req, res) => {
  const { url, tags } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  const urlTrimmed = url.trim();

  // DOI detection — handle doi.org URLs and bare DOIs
  const doiMatch = urlTrimmed.match(/(?:https?:\/\/(?:dx\.)?doi\.org\/|^)(10\.\d{4,}\/\S+)/i);
  if (doiMatch) {
    const doi = doiMatch[1];
    try {
      const { ingestDOI } = await import('../services/urlIngester.js');
      const metadata = await ingestDOI(doi);
      const text = [
        metadata.title,
        metadata.author ? 'Author: ' + metadata.author : '',
        metadata.year ? 'Published: ' + metadata.year : '',
        metadata.journal ? 'Journal: ' + metadata.journal : '',
        metadata.abstract || ''
      ].filter(Boolean).join('\n\n');
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const source = await saveSourceToKB(req.user.id, {
        title: metadata.title,
        author: metadata.author,
        text,
        wordCount,
        source_type: 'paper',
        source_url: 'https://doi.org/' + doi,
        tags: tags || []
      });
      return res.status(202).json({ id: source.id, status: 'processing', title: source.title });
    } catch (err) {
      return res.status(422).json({ error: 'Could not resolve DOI: ' + err.message });
    }
  }

  // arXiv detection
  const arxivMatch = urlTrimmed.match(/arxiv\.org\/(?:abs|pdf)\/([\d.]+(?:v\d+)?)/i);
  if (arxivMatch) {
    const arxivId = arxivMatch[1];
    try {
      const { ingestArXiv } = await import('../services/urlIngester.js');
      const metadata = await ingestArXiv(arxivId);
      const text = [
        metadata.title,
        metadata.author ? 'Author: ' + metadata.author : '',
        metadata.year ? 'Published: ' + metadata.year : '',
        'arXiv: ' + metadata.arxiv_id,
        metadata.abstract || ''
      ].filter(Boolean).join('\n\n');
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const source = await saveSourceToKB(req.user.id, {
        title: metadata.title,
        author: metadata.author,
        text,
        wordCount,
        source_type: 'paper',
        source_url: metadata.source_url,
        tags: tags || []
      });
      return res.status(202).json({ id: source.id, status: 'processing', title: source.title });
    } catch (err) {
      return res.status(422).json({ error: 'Could not fetch arXiv paper: ' + err.message });
    }
  }

  // Standard URL ingestion
  try {
    const article = await ingestURL(urlTrimmed);
    const source = await saveSourceToKB(req.user.id, {
      title: article.title,
      author: article.byline || article.siteName,
      text: article.text,
      wordCount: article.wordCount,
      source_type: 'url',
      source_url: urlTrimmed,
      tags: tags || []
    });
    res.status(202).json({ id: source.id, status: 'processing', title: source.title });
  } catch (err) {
    console.error('[sources/ingest-url] Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/sources/ingest-text  { title, author, text, source_type, tags }
router.post('/ingest-text', requireAuth, async (req, res) => {
  const { title, author, text, source_type, tags } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });

  try {
    const processed = (source_type === 'transcript' || source_type === 'interview')
      ? processTranscript(text)
      : processText(text);

    const source = await saveSourceToKB(req.user.id, {
      title: title || 'Untitled Note',
      author: author || '',
      text: processed.text,
      wordCount: processed.wordCount,
      source_type: source_type || 'note',
      tags: tags || []
    });
    res.status(202).json({ id: source.id, status: 'processing', title: source.title });
  } catch (err) {
    console.error('[sources/ingest-text] Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

export default router;
