import fetch from 'node-fetch';
import { ANALYSIS_SYSTEM_PROMPT } from '../prompts/analysisPrompt.js';
import { buildChatSystemPrompt } from '../prompts/chatPrompt.js';
import { buildModePrompt, MODE_MAX_TOKENS } from '../prompts/learningModePrompts.js';

// OpenRouter — OpenAI-compatible endpoint
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Best model for book analysis, RAG chat, and storytelling.
// Good alternatives: 'google/gemini-2.5-flash', 'openai/gpt-4o'
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-5';

function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
    'X-Title': 'BookSphere'
  };
}

/**
 * Core OpenRouter call — OpenAI chat completions format.
 */
function isTransientNetworkError(err) {
  const msg = err?.message || '';
  return (
    msg.includes('Premature close') ||
    msg.includes('socket hang up') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('fetch failed') ||
    err?.code === 'ECONNRESET' ||
    err?.code === 'ETIMEDOUT'
  );
}

async function callOpenRouterOnce(systemPrompt, messages, maxTokens) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  };

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // Check if response was truncated due to token limit
  const finishReason = data.choices?.[0]?.finish_reason;
  if (finishReason === 'length') {
    console.warn(`[claudeService] Response truncated (finish_reason=length). Consider increasing max_tokens.`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter returned empty content');
  }
  return content;
}

/**
 * The connection to OpenRouter occasionally drops mid-stream ("Premature
 * close", socket hang up, etc.) — a transient network blip, not a real
 * failure of the request itself. Retry once after a short delay before
 * giving up, instead of immediately failing the whole chat/story request.
 */
async function callOpenRouter(systemPrompt, messages, maxTokens = 2000) {
  try {
    return await callOpenRouterOnce(systemPrompt, messages, maxTokens);
  } catch (err) {
    if (isTransientNetworkError(err)) {
      console.warn(`[claudeService] Transient network error (${err.message}) — retrying once...`);
      await new Promise(r => setTimeout(r, 1000));
      return await callOpenRouterOnce(systemPrompt, messages, maxTokens);
    }
    throw err;
  }
}

function stripFences(raw) {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

/**
 * The model frequently forgets that string values inside the JSON it
 * returns must escape literal newlines/tabs and inner double-quote
 * characters (e.g. dialogue in narrative prose, or SVG markup that — like
 * all SVG/HTML — normally uses double-quoted attributes). Walk the text
 * tracking whether we're inside a JSON string, and:
 *  - escape raw control characters (\n, \r, \t) found inside strings
 *  - escape a `"` found inside a string UNLESS it looks like the real
 *    end of that string value (i.e. followed, after whitespace, by a
 *    JSON structural character that only makes sense as a delimiter)
 * This is heuristic, not a real JSON grammar, but recovers the large
 * majority of "Expected ',' or '}'" failures caused by unescaped quotes.
 */
function repairJSONString(raw) {
  const text = stripFences(raw);
  let result = '';
  let inString = false;

  const peekNonSpace = (fromIdx) => {
    let j = fromIdx;
    while (j < text.length && /\s/.test(text[j])) j++;
    return { ch: text[j], idx: j };
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '\\' && inString) {
      result += ch;
      if (i + 1 < text.length) { result += text[i + 1]; i++; }
      continue;
    }

    if (ch === '"') {
      if (!inString) {
        inString = true;
        result += ch;
        continue;
      }
      const { ch: next, idx: nextIdx } = peekNonSpace(i + 1);
      let realEnd = next === undefined || next === ':' || next === '}' || next === ']';
      if (!realEnd && next === ',') {
        const { ch: afterComma } = peekNonSpace(nextIdx + 1);
        realEnd = afterComma === '"' || afterComma === '{' || afterComma === '[';
      }
      if (realEnd) {
        inString = false;
        result += ch;
      } else {
        result += '\\"';
      }
      continue;
    }

    if (inString && (ch === '\n' || ch === '\r' || ch === '\t')) {
      result += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : '\\t';
      continue;
    }

    result += ch;
  }

  return result;
}

/**
 * Try to repair truncated JSON by closing unclosed brackets/braces/strings.
 * Operates on already-cleaned (fence-stripped) text.
 */
function tryRepairJSON(cleanedInput) {
  try {
    let cleaned = cleanedInput
      .replace(/,\s*"[^"]*$/, '')
      .replace(/,\s*$/, '');

    // Count open braces/brackets and close them
    const stack = [];
    let inString = false;
    let escape = false;

    for (const ch of cleaned) {
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if (ch === '}' || ch === ']') stack.pop();
    }

    // Close any open string
    if (inString) cleaned += '"';

    // Close all open brackets/braces in reverse order
    while (stack.length > 0) {
      cleaned += stack.pop();
    }

    return JSON.parse(cleaned);
  } catch (_) {
    return null;
  }
}

/**
 * Strip markdown code fences and parse JSON.
 * Tries, in order: (1) direct parse, (2) parse after repairing unescaped
 * quotes/control-chars inside string values, (3) repair truncation by
 * closing open brackets, (4) both repairs combined.
 */
function parseJSON(raw, context = 'response') {
  const cleaned = stripFences(raw);

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    try {
      const fixedQuotes = repairJSONString(raw);
      const parsed = JSON.parse(fixedQuotes);
      console.warn(`[claudeService] JSON for ${context} had unescaped quotes/newlines — auto-repaired.`);
      return parsed;
    } catch (_) { /* fall through */ }

    const salvaged = tryRepairJSON(cleaned);
    if (salvaged) {
      console.warn(`[claudeService] JSON was truncated for ${context} — used repaired version.`);
      return salvaged;
    }

    const salvagedBoth = tryRepairJSON(repairJSONString(raw));
    if (salvagedBoth) {
      console.warn(`[claudeService] JSON for ${context} had both truncation and unescaped quotes — used repaired version.`);
      return salvagedBoth;
    }

    console.error(`[claudeService] Failed to parse JSON from ${context}:`, err.message);
    console.error('Raw response (first 500 chars):', raw?.substring(0, 500));
    throw new Error(`AI returned invalid JSON for ${context}`);
  }
}

// Condensed analysis prompt for retry (produces smaller JSON)
const CONDENSED_ANALYSIS_PROMPT = `You are a literary analyst and business strategist. Analyze the book text and return ONLY valid JSON — no markdown, no explanation. Be concise: summary max 200 words, max 3 items per array field.

Return exactly this structure:
{
  "title": "[book title]",
  "author": "[author]",
  "genre": "[thriller|romance|psychological|comical|self-help|horror|fantasy|historical|educational|biography]",
  "genre_confidence": 0.9,
  "summary": "[200 word max summary]",
  "tone": "[brief tone description]",
  "themes": ["theme1", "theme2", "theme3"],
  "setting": { "time_period": "", "locations": ["place1"], "atmosphere": "" },
  "characters": [{ "name": "", "role": "protagonist", "description": "", "arc": "", "business_parallel": "" }],
  "key_frameworks": [{ "name": "", "description": "", "business_application": "" }],
  "business_insights": [{ "insight": "", "context": "", "application": "", "urgency": "high" }],
  "key_quotes": [{ "quote": "", "speaker": "", "business_relevance": "" }],
  "chapter_breakdown": [{ "chapter": "", "summary": "", "key_lesson": "" }],
  "action_items": ["Action 1", "Action 2", "Action 3"],
  "ideal_reader_stage": "any"
}`;

/**
 * Analyze a book and extract structured insights.
 * Tries full analysis first (8000 tokens), falls back to condensed (4000 tokens) on JSON error.
 */
export async function analyzeBook(text, wordCount) {
  // For very large books: first 40k words + last 15k words
  let analysisText = text;
  if (wordCount > 80000) {
    const words = text.split(/\s+/);
    const first = words.slice(0, 40000).join(' ');
    const last = words.slice(-15000).join(' ');
    analysisText = `${first}\n\n[...middle of book omitted for length...]\n\n${last}`;
  }

  // First attempt: full analysis with high token budget
  try {
    const raw = await callOpenRouter(
      ANALYSIS_SYSTEM_PROMPT,
      [{ role: 'user', content: `Analyze this book text thoroughly and return the JSON:\n\n${analysisText}` }],
      8000
    );
    return parseJSON(raw, 'book analysis');
  } catch (err) {
    console.warn(`[analyzeBook] Full analysis failed (${err.message}), retrying with condensed prompt...`);
  }

  // Retry: condensed analysis — shorter output, less likely to truncate
  const raw2 = await callOpenRouter(
    CONDENSED_ANALYSIS_PROMPT,
    [{ role: 'user', content: `Analyze this book text concisely:\n\n${analysisText.slice(0, 60000)}` }],
    4000
  );
  return parseJSON(raw2, 'book analysis (condensed)');
}

/**
 * Chat with book context using RAG-retrieved chunks.
 * mode: 'reading' (default) — pure literary discussion, no business framing.
 *       'business' — explicitly map the answer to the user's startup.
 */
export async function chatWithBook(bookAnalysis, relevantChunks, messageHistory, userMessage, mode = 'reading', userProfile = null) {
  const systemPrompt = buildChatSystemPrompt(bookAnalysis, relevantChunks, mode, userProfile);

  const historyMessages = (messageHistory || []).slice(-10).map(m => ({
    role: m.role,
    content: m.content
  }));

  const messages = [
    ...historyMessages,
    { role: 'user', content: userMessage }
  ];

  const raw = await callOpenRouter(systemPrompt, messages, 2500);

  // The model sometimes ignores the "return only JSON" instruction and just
  // answers in plain prose (the content itself is usually still perfectly
  // good — it's just not wrapped). Rather than throwing that away as a hard
  // error (which previously crashed the whole server via an unhandled
  // rejection), fall back to using the raw text directly as the answer.
  let parsed;
  try {
    parsed = parseJSON(raw, 'chat response');
  } catch (_) {
    console.warn('[claudeService] Chat response was not JSON — using raw text as the answer instead of failing.');
    parsed = { text: raw.trim(), visualization: null, business_insight: null, suggested_followups: [] };
  }

  return {
    text: parsed.text || '',
    visualization: parsed.visualization || { type: 'none', title: null, code: null },
    business_insight: parsed.business_insight || null,
    suggested_followups: parsed.suggested_followups || []
  };
}

/**
 * Core function for all six learning modes (Scholar, Critic, Synthesizer,
 * Practitioner, Teacher, Experiment). Uses the same callOpenRouter +
 * parseJSON infrastructure already battle-tested in analyzeBook() and
 * chatWithBook() above.
 */
export async function learnWithSources(session, formattedChunks, messageHistory, userMessage) {
  const { mode, topic, loop_step: loopStep = 0 } = session;

  const systemPrompt = buildModePrompt(
    mode,
    topic,
    formattedChunks,
    loopStep,
    session.learning_context || ''
  );

  const historyMessages = (messageHistory || [])
    .slice(-8)
    .map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));

  const raw = await callOpenRouter(
    systemPrompt,
    [...historyMessages, { role: 'user', content: userMessage }],
    MODE_MAX_TOKENS[mode] || 2500
  );

  let parsed;
  try {
    parsed = parseJSON(raw, `${mode} mode response`);
  } catch (_) {
    // Graceful fallback: wrap raw text in minimal valid structure
    parsed = { evidence_blocks: [], response: raw.trim(), followup_questions: [] };
  }

  return {
    evidence_blocks: parsed.evidence_blocks || [],
    // Normalise: different modes store the main text in different fields
    interpretation: parsed.what_authors_said || parsed.response || parsed.synthesis_insight || parsed.core_principle || '',
    synthesis: parsed.novel_combination || parsed.verdict || '',
    mode_output: parsed, // full structured output for the frontend
    followup_questions: parsed.followup_questions || [],
    loop_step: loopStep,
    can_advance: parsed.can_advance !== false
  };
}

/**
 * Pulls 1-3 short, reusable concept labels out of a saved insight so the
 * Concept Graph (Learning Memory → Concepts tab) can connect ideas across
 * sessions and sources instead of leaving each insight isolated. Kept
 * deliberately cheap (small max_tokens, no retrieval) — this runs as a
 * best-effort side effect right after an insight is saved, never blocking
 * the save itself (see routes/learn.js).
 */
/**
 * Auto-generate a 3-sentence session summary as a reflection insight.
 * Called non-blockingly after a user completes a Teacher session.
 */
export async function summarizeSession(topic, mode, messages) {
  const systemPrompt = `You are distilling a learning session into a concise, permanent reflection for the user's learning memory.

Rules:
- Write exactly 3 sentences.
- Sentence 1: The core concept explored and what the key sources said about it.
- Sentence 2: The most important realization or shift in understanding from this session.
- Sentence 3: The concrete next step or experiment that emerged.
- Write in first person from the learner's perspective ("I learned...", "I now understand...", "My next step is...").
- No bullet points. No headers. Just three flowing sentences.

Respond with ONLY this JSON:
{"summary": "three-sentence reflection"}`;

  const sessionDigest = messages
    .slice(-12)
    .map(m => `${m.role === 'user' ? 'Me' : 'AI'}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content).slice(0, 300)}`)
    .join('\n');

  try {
    const raw = await callOpenRouter(
      systemPrompt,
      [{ role: 'user', content: `Topic: ${topic}\nMode: ${mode}\n\nSession excerpt:\n${sessionDigest}` }],
      400
    );
    const parsed = parseJSON(raw, 'session summary');
    return parsed.summary || '';
  } catch (err) {
    console.warn('[summarizeSession] Failed:', err.message);
    return '';
  }
}

export async function extractConcepts(insightContent) {
  const systemPrompt = `You extract reusable CONCEPTS from a single learning insight so they can be linked across a personal knowledge graph.

Rules:
- Return 1 to 3 concepts max — only the ideas genuinely worth re-using elsewhere, not every noun in the sentence.
- Each label is a short noun phrase, 1-4 words, Title Case (e.g. "Deep Work", "Loss Aversion", "Iterative Design").
- Prefer concepts that are abstract/transferable over ones specific to one book or person.
- description is one short clause (under 15 words) capturing what this insight says about the concept.

Respond with ONLY this JSON shape, no other text:
{"concepts": [{"label": "string", "description": "string"}]}`;

  try {
    const raw = await callOpenRouter(systemPrompt, [{ role: 'user', content: insightContent.slice(0, 1200) }], 300);
    const parsed = parseJSON(raw, 'concept extraction');
    return Array.isArray(parsed.concepts) ? parsed.concepts.slice(0, 3).filter(c => c?.label) : [];
  } catch (err) {
    console.warn('[extractConcepts] Failed, skipping concept linking for this insight:', err.message);
    return [];
  }
}

export async function callOpenRouterStream(systemPrompt, messages, maxTokens, res) {
  const body = {
    model:      MODEL,
    max_tokens: maxTokens,
    stream:     true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  };
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  const response = await fetch(OPENROUTER_URL, {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify(body)
  });
  if (!response.ok) {
    const errText = await response.text();
    res.write(`data: ${JSON.stringify({ error: 'AI error ' + response.status })}\n\n`);
    res.end();
    throw new Error('OpenRouter stream error ' + response.status + ': ' + errText);
  }
  let fullText = '';
  return new Promise((resolve, reject) => {
    let buffer = '';
    response.body.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed === 'data: [DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              res.write('data: ' + JSON.stringify({ delta }) + '\n\n');
            }
          } catch (_) {}
        }
      }
    });
    response.body.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
      resolve(fullText);
    });
    response.body.on('error', (err) => {
      console.error('[claudeService] Stream error:', err.message);
      res.end();
      reject(err);
    });
  });
}

export async function reviewExperiment(experiment, actualOutcome) {
  const systemPrompt = `You are a rigorous scientific reviewer helping someone learn from a real-world experiment they ran on a principle from their personal Knowledge Canon.
Your job: compare what they predicted would happen against what actually happened. Be specific and intellectually honest — don't just validate. Identify surprises, blind spots, and what this reveals about the underlying principle.
Return ONLY this JSON (no markdown, no explanation):
{"gap_analysis":"2-4 sentences explaining why predicted vs actual differ. What variable wasn't accounted for? What assumption was wrong?","lesson":"One concrete, actionable takeaway that refines the principle or changes how it should be applied.","confidence":"high|medium|low"}`;
  const userMessage = 'Experiment: ' + (experiment.title || experiment.principle) +
    '\nHypothesis: ' + (experiment.hypothesis || 'Not specified') +
    '\nPrinciple being tested: ' + experiment.principle +
    '\nPredicted outcome: ' + (experiment.predicted_outcome || 'Not specified') +
    '\nActual outcome: ' + actualOutcome;
  try {
    const raw = await callOpenRouter(systemPrompt, [{ role: 'user', content: userMessage }], 600);
    const parsed = parseJSON(raw, 'experiment review');
    return {
      gap_analysis: parsed.gap_analysis || null,
      lesson:       parsed.lesson || null,
      confidence:   parsed.confidence || 'medium'
    };
  } catch (err) {
    console.warn('[reviewExperiment] Failed:', err.message);
    return { gap_analysis: null, lesson: null, confidence: 'low' };
  }
}
