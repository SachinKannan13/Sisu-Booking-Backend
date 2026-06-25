import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

/**
 * Fetch an arbitrary URL and extract its main article content using
 * Mozilla's Readability (the same algorithm behind Firefox Reader View).
 * Falls back to a clear error rather than silently returning junk HTML
 * if the page can't be parsed as an article.
 *
 * @param {string} url
 * @returns {Promise<{title: string, byline: string, text: string, wordCount: number, siteName: string}>}
 */
export async function ingestURL(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (_) {
    throw new Error('Invalid URL');
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error('Only http/https URLs are supported');
  }

  // node-fetch v3 (used here, per package.json) dropped the `timeout` option
  // that v2 had — passing it is silently ignored, not an error, so a slow or
  // hanging URL would block this request (and the HTTP response to the
  // client) indefinitely. Use AbortController to actually enforce a cap.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BookSphereBot/1.0; +learning-os)'
      },
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Fetching that URL took too long (>20s) — the site may be slow or unreachable.');
    }
    throw new Error(`Failed to fetch URL: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (HTTP ${response.status})`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent || article.textContent.trim().length < 50) {
    throw new Error('Could not extract readable article content from this URL');
  }

  const text = article.textContent
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    title: article.title || parsed.hostname,
    byline: article.byline || '',
    text,
    wordCount,
    siteName: article.siteName || parsed.hostname
  };
}

export async function ingestDOI(doi) {
  const url = 'https://api.crossref.org/works/' + encodeURIComponent(doi);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BookSphere/1.0 (mailto:contact@booksphere.app)' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error('CrossRef returned ' + response.status);
    const data = await response.json();
    const work = data?.message;
    if (!work) throw new Error('CrossRef returned no metadata');
    const title   = Array.isArray(work.title) ? work.title[0] : work.title || 'Untitled Paper';
    const authors = (work.author || [])
      .map(a => [a.given, a.family].filter(Boolean).join(' '))
      .join(', ') || 'Unknown Author';
    const year    = work.published?.['date-parts']?.[0]?.[0]?.toString() || '';
    const journal = Array.isArray(work['container-title']) ? work['container-title'][0] : work['container-title'] || '';
    const abstract = work.abstract ? work.abstract.replace(/<[^>]+>/g, ' ').trim() : '';
    return { title, author: authors, abstract, year, journal, doi, source_type: 'paper' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function ingestArXiv(arxivId) {
  const cleanId = arxivId.replace(/v\d+$/, '');
  const url = 'https://export.arxiv.org/api/query?id_list=' + encodeURIComponent(cleanId) + '&max_results=1';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BookSphere/1.0' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error('arXiv API returned ' + response.status);
    const xml = await response.text();
    const extractTag = (tag) => {
      const match = xml.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
      return match ? match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
    };
    const extractAllTags = (tag) => {
      const re = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'gi');
      const matches = [];
      let m;
      while ((m = re.exec(xml)) !== null) {
        matches.push(m[1].replace(/<[^>]+>/g, ' ').trim());
      }
      return matches;
    };
    const title     = extractTag('title').replace(/\n/g, ' ');
    const abstract  = extractTag('summary');
    const names     = extractAllTags('name');
    const authors   = names.join(', ') || 'Unknown Author';
    const published = extractTag('published');
    const year      = published ? published.slice(0, 4) : '';
    if (!title || title === 'Error') throw new Error('arXiv returned no results for this ID');
    return { title, author: authors, abstract, year, arxiv_id: cleanId, source_url: 'https://arxiv.org/abs/' + cleanId, source_type: 'paper' };
  } finally {
    clearTimeout(timeout);
  }
}
