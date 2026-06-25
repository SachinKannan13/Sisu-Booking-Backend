/**
 * Chapter-boundary-aware text chunker for RAG indexing.
 */
const CHAPTER_HEADING_RE = /^(?:(?:chapter|part|section|unit|module|lesson|act|appendix|preface|introduction|prologue|epilogue|afterword|foreword|conclusion|summary)\b[\s\d\w.:-]*|(?:#{1,3})\s+\S.{0,80}|\d{1,2}[.)]\s+[A-Z].{0,80})$/im;

function splitIntoChapters(text) {
  const lines = text.split('\n');
  const sections = [];
  let currentHeading = 'Introduction';
  let currentLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && CHAPTER_HEADING_RE.test(trimmed) && trimmed.length < 120) {
      if (currentLines.length > 0) {
        const body = currentLines.join('\n').trim();
        if (body.length > 50) sections.push({ heading: currentHeading, body });
        currentLines = [];
      }
      currentHeading = trimmed;
    } else {
      currentLines.push(line);
    }
  }
  const lastBody = currentLines.join('\n').trim();
  if (lastBody.length > 50) {
    sections.push({ heading: currentHeading, body: lastBody });
  }
  if (sections.length === 0) {
    sections.push({ heading: 'Content', body: text.trim() });
  }
  return sections;
}

function chunkSection(body, chunkSize, overlap) {
  const words = body.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const end = Math.min(i + chunkSize, words.length);
    chunks.push(words.slice(i, end).join(' '));
    i += chunkSize - overlap;
    if (chunkSize <= overlap) break;
  }
  return chunks;
}

export function chunkText(text, chunkSize = 500, overlap = 50) {
  const sections = splitIntoChapters(text);
  const allChunks = [];
  let globalIndex = 0;
  sections.forEach((section, chapterIndex) => {
    const sectionChunks = chunkSection(section.body, chunkSize, overlap);
    sectionChunks.forEach(content => {
      allChunks.push({
        content,
        chunk_index:   globalIndex,
        chapter_title: section.heading,
        chapter_index: chapterIndex,
        page_estimate: Math.floor((globalIndex * chunkSize) / 250)
      });
      globalIndex++;
    });
  });
  return allChunks;
}
