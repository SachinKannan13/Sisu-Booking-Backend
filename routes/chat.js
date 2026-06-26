import express from 'express';
import supabase from '../database/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { retrieveRelevantChunks } from '../services/ragEngine.js';
import { chatWithBook } from '../services/claudeService.js';

const router = express.Router();

/**
 * Detect if the user's message is a reading/section-fetch command.
 * Returns { type, query } if detected, or null if it's a normal chat message.
 */
function detectReadingCommand(message) {
  const m = message.toLowerCase().trim();

  // Patterns: "read chapter 3", "read me chapter 3", "show chapter X", "go to chapter X"
  const chapterNumMatch = m.match(/(?:read(?:\s+me)?|show(?:\s+me)?|open|go\s+to|take\s+me\s+to)\s+chapter\s+(\d+|[a-z]+)/i);
  if (chapterNumMatch) return { type: 'chapter', query: chapterNumMatch[1] };

  // Patterns: "read the part about X", "show me the section on X", "find where they talk about X"
  const topicMatch = m.match(/(?:read|show|find|go to)\s+(?:the\s+)?(?:part|section|chapter|bit)\s+(?:about|on|where|when)\s+(.+)/i);
  if (topicMatch) return { type: 'topic', query: topicMatch[1].trim() };

  // Pattern: "what does chapter X say" / "what's in chapter X"
  const chapterQueryMatch = m.match(/what(?:'s|\s+is|\s+does)\s+(?:in\s+)?chapter\s+(\w+)(?:\s+say)?/i);
  if (chapterQueryMatch) return { type: 'chapter', query: chapterQueryMatch[1] };

  // Pattern: "fetch chapter X" / "display chapter X" / "bring up chapter X"
  const fetchMatch = m.match(/(?:fetch|display|bring\s+up|pull\s+up)\s+(?:chapter\s+)?(.+)/i);
  if (fetchMatch && fetchMatch[1].length < 50) return { type: 'topic', query: fetchMatch[1].trim() };

  return null;
}

// POST /api/chat/:bookId
router.post('/:bookId', requireAuth, async (req, res) => {
  try {
    await handleChatMessage(req, res);
  } catch (err) {
    // Last-resort safety net: a failure anywhere in this handler (a bad AI
    // response, a transient Supabase error, etc.) must return a normal
    // error response to the client, never an unhandled rejection that
    // takes the whole process down. This is what was crashing the server
    // every time the model returned non-JSON chat output.
    console.error('[chat] Unhandled error in /api/chat/:bookId:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chat failed: ' + err.message });
    }
  }
});

async function handleChatMessage(req, res) {
  const { bookId } = req.params;
  const { message, conversation_id, mode, lens } = req.body;
  // Support both old 'business' mode name and new 'apply' mode name
  const chatMode = (mode === 'business' || mode === 'apply') ? 'apply' : 'reading';
  const chatLens = lens || 'personal';
  const userId = req.user.id;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Verify ownership
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('user_id', userId)
    .single();

  if (bookError || !book) return res.status(404).json({ error: 'Book not found' });
  if (book.status !== 'ready') return res.status(400).json({ error: 'Book is still processing' });

  // Get or create conversation
  let convId = conversation_id;
  if (!convId) {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ book_id: bookId, user_id: userId, mode: 'chat' })
      .select()
      .single();
    if (convError) return res.status(500).json({ error: convError.message });
    convId = conv.id;
  }

  // Check for reading commands first ("read me chapter 3", "show the part about X"...).
  // If we find matching chunks, we answer with the actual book text instead of
  // running the full RAG + LLM chat pipeline.
  const readingCommand = detectReadingCommand(message);
  if (readingCommand) {
    const searchQRaw = readingCommand.query;
    const searchQ = searchQRaw.replace(/[,()]/g, ' ').trim();

    const { data: chunkResults } = await supabase
      .from('book_chunks')
      .select('chunk_index, content, chapter_title, page_estimate')
      .eq('book_id', bookId)
      .or(`chapter_title.ilike.%${searchQ}%,content.ilike.%${searchQ}%`)
      .order('chunk_index', { ascending: true })
      .limit(8);

    if (chunkResults && chunkResults.length > 0) {
      // Find the chapter info from book analysis
      const matchedChapter = (book.chapter_breakdown || []).find(ch =>
        ch.chapter?.toLowerCase().includes(searchQ.toLowerCase())
      );

      // Save user message
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert({ conversation_id: convId, role: 'user', content: message });
      if (userMsgError) return res.status(500).json({ error: userMsgError.message });

      // Build a reading response
      const chapterTitle = chunkResults[0]?.chapter_title || `Section: "${searchQ}"`;
      const combinedText = chunkResults.slice(0, 4).map(c => c.content).join('\n\n');
      const pageInfo = chunkResults[0]?.page_estimate ? `(around page ${chunkResults[0].page_estimate})` : '';

      const responseText = matchedChapter?.summary
        ? `Here's what happens in "${chapterTitle}" ${pageInfo}:\n\n${combinedText}\n\n---\nChapter insight: ${matchedChapter.key_lesson}`
        : `Here's the text from "${chapterTitle}" ${pageInfo}:\n\n${combinedText}`;

      const followups = [
        `Explain what happens in "${chapterTitle}" in simple terms`,
        `What's the key lesson from this section?`,
        `How does this part of the book apply to my business situation?`
      ];

      // Save and return as a special reading block message
      const { data: assistantMsg } = await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: responseText,
        visualization_type: 'reading_block',
        visualization_html: JSON.stringify({
          chapter_title: chapterTitle,
          chunk_index: chunkResults[0]?.chunk_index || 0,
          page_estimate: chunkResults[0]?.page_estimate || 0,
          chunks_count: chunkResults.length
        }),
        suggested_followups: followups
      }).select().single();

      return res.json({
        message_id: assistantMsg?.id,
        text: responseText,
        visualization: {
          type: 'reading_block',
          title: chapterTitle,
          code: JSON.stringify({
            chapter_title: chapterTitle,
            chunk_index: chunkResults[0]?.chunk_index || 0,
            page_estimate: chunkResults[0]?.page_estimate || 0
          })
        },
        business_insight: null,
        suggested_followups: followups,
        conversation_id: convId
      });
    }
    // If no chunks found matching the search, fall through to normal chat below.
  }

  // Save user message
  const { error: userMsgError } = await supabase
    .from('messages')
    .insert({ conversation_id: convId, role: 'user', content: message });
  if (userMsgError) return res.status(500).json({ error: userMsgError.message });

  // Retrieve relevant chunks via RAG
  const relevantChunks = await retrieveRelevantChunks(bookId, message, 5);

  // Fetch user profile for personalised context (non-fatal if missing)
  let userProfile = null;
  try {
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('business_name, industry, stage, main_goal, current_challenge')
      .eq('user_id', userId)
      .single();
    userProfile = profileData;
  } catch (_) { /* no profile yet — fine */ }

  // Get last 10 messages for context
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(10);

  // Remove the last message (we just inserted it; it's the user turn)
  const historyWithoutLast = (history || []).slice(0, -1);

  // Call Claude
  const aiResponse = await chatWithBook(book, relevantChunks, historyWithoutLast, message, chatMode, userProfile, chatLens);

  // Save assistant response
  const { data: assistantMsg, error: assistantError } = await supabase
    .from('messages')
    .insert({
      conversation_id: convId,
      role: 'assistant',
      content: aiResponse.text,
      visualization_type: aiResponse.visualization?.type || null,
      visualization_html: aiResponse.visualization?.code || null,
      business_insight: aiResponse.business_insight || null,
      suggested_followups: aiResponse.suggested_followups || []
    })
    .select()
    .single();

  if (assistantError) {
    console.error('[chat] Failed to save assistant message:', assistantError.message);
  }

  res.json({
    message_id: assistantMsg?.id,
    text: aiResponse.text,
    visualization: aiResponse.visualization,
    business_insight: aiResponse.business_insight,
    suggested_followups: aiResponse.suggested_followups,
    conversation_id: convId
  });
}

// GET /api/chat/:bookId/history
router.get('/:bookId/history', requireAuth, async (req, res) => {
  const { bookId } = req.params;
  const userId = req.user.id;

  // Verify book ownership
  const { data: book } = await supabase
    .from('books')
    .select('id')
    .eq('id', bookId)
    .eq('user_id', userId)
    .single();

  if (!book) return res.status(404).json({ error: 'Book not found' });

  // Get or create conversation
  let { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('book_id', bookId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!conv) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ book_id: bookId, user_id: userId, mode: 'chat' })
      .select()
      .single();
    conv = newConv;
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ conversation_id: conv.id, messages: messages || [] });
});

// DELETE /api/chat/:bookId/clear
router.delete('/:bookId/clear', requireAuth, async (req, res) => {
  const { bookId } = req.params;
  const userId = req.user.id;

  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('book_id', bookId)
    .eq('user_id', userId)
    .single();

  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conv.id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, conversation_id: conv.id });
});

export default router;
