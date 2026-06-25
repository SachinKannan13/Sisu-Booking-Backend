import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { EPub } from 'epub2';

/**
 * Extract raw text from a book file buffer.
 * @param {Buffer} buffer - File content as buffer
 * @param {string} fileType - 'pdf' | 'docx' | 'epub'
 * @returns {Promise<{text: string, wordCount: number}>}
 */
export async function processBook(buffer, fileType) {
  let rawText = '';

  try {
    if (fileType === 'pdf') {
      const data = await pdfParse(buffer);
      rawText = data.text;
    } else if (fileType === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else if (fileType === 'epub') {
      rawText = await extractEpubText(buffer);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (err) {
    console.error(`[bookProcessor] Error processing ${fileType}:`, err.message);
    throw new Error(`Failed to extract text from ${fileType}: ${err.message}`);
  }

  // Clean text: normalize whitespace, remove null bytes
  const cleaned = rawText
    .replace(/\x00/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;

  return { text: cleaned, wordCount };
}

/**
 * Extract text from EPUB buffer.
 * epub2 requires a file path, so we write to a temp file first.
 */
async function extractEpubText(buffer) {
  const { writeFileSync, unlinkSync, mkdtempSync } = await import('fs');
  const { join } = await import('path');
  const { tmpdir } = await import('os');

  const tempDir = mkdtempSync(join(tmpdir(), 'booksphere-'));
  const tempPath = join(tempDir, 'book.epub');

  try {
    writeFileSync(tempPath, buffer);

    return new Promise((resolve, reject) => {
      const epub = new EPub(tempPath);

      epub.on('end', () => {
        const chapters = epub.flow;
        const textParts = [];
        let pending = chapters.length;

        if (pending === 0) return resolve('');

        chapters.forEach((chapter) => {
          epub.getChapter(chapter.id, (err, text) => {
            if (!err && text) {
              // Strip HTML tags from epub chapter
              const plain = text
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
              textParts.push(plain);
            }
            pending--;
            if (pending === 0) resolve(textParts.join('\n\n'));
          });
        });
      });

      epub.on('error', reject);
      epub.parse();
    });
  } finally {
    try { unlinkSync(tempPath); } catch (_) {}
    try { require('fs').rmdirSync(tempDir); } catch (_) {}
  }
}

/**
 * Determine file extension from MIME type.
 */
export function mimeToFileType(mimetype) {
  const map = {
    'application/pdf': 'pdf',
    'application/epub+zip': 'epub',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
  };
  return map[mimetype] || null;
}

/**
 * Get file extension from MIME type.
 */
export function mimeToExt(mimetype) {
  const map = {
    'application/pdf': 'pdf',
    'application/epub+zip': 'epub',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
  };
  return map[mimetype] || 'bin';
}

// ============================================================
// Learning OS additions — plain-text / transcript ingestion.
// Append-only: nothing above this line is touched, so existing
// file-upload behavior (processBook, mimeToFileType, mimeToExt)
// is unaffected.
// ============================================================

/**
 * Clean raw pasted text the same way processBook() cleans extracted
 * file text, so downstream chunking/analysis sees consistent input
 * regardless of source.
 * @param {string} rawText
 * @returns {{text: string, wordCount: number}}
 */
export function processText(rawText) {
  const cleaned = (rawText || '')
    .replace(/\x00/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
  return { text: cleaned, wordCount };
}

/**
 * Clean a transcript/interview pasted as raw text. Strips common
 * caption-file timestamp formats (VTT/SRT) and converts
 * "SPEAKER NAME:" style labels into section markers so chunking
 * naturally breaks on speaker turns instead of mid-sentence.
 * @param {string} rawText
 * @returns {{text: string, wordCount: number}}
 */
export function processTranscript(rawText) {
  let text = rawText || '';

  // Strip WEBVTT header
  text = text.replace(/^WEBVTT.*\n/i, '');

  // Strip VTT/SRT timestamp lines, e.g.
  // "00:00:01.000 --> 00:00:04.000" or "00:00:01,000 --> 00:00:04,000"
  text = text.replace(/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}.*$/gm, '');

  // Strip bare SRT sequence numbers (lines that are just digits)
  text = text.replace(/^\d+$/gm, '');

  // Convert "SPEAKER NAME:" labels (all-caps, up to ~30 chars) into a
  // markdown-style section marker so chunking treats each speaker turn
  // as a natural break point.
  text = text.replace(/^([A-Z][A-Z\s]{1,30}):\s*/gm, '\n### $1\n');

  const cleaned = text
    .replace(/\x00/g, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
  return { text: cleaned, wordCount };
}

/**
 * Build the attribution metadata stamped onto every chunk of a source,
 * so retrieveAcrossKB() can later cite "[Author, "Title", Section]"
 * without a second database lookup per chunk.
 * @param {string} sourceType - 'book'|'article'|'essay'|'paper'|'transcript'|'interview'|'note'|'url'
 * @param {string} author
 * @param {string} title
 * @returns {{source_type: string, source_author: string, source_title: string}}
 */
export function buildChunkMetadata(sourceType, author, title) {
  return {
    source_type: sourceType || 'note',
    source_author: author || '',
    source_title: title || ''
  };
}
