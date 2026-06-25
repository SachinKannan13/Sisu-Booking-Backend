import fetch from 'node-fetch';
import supabase from '../database/supabase.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Real image generation, not text-model-drawn SVG. Asking a text model to
// hand-author precise SVG path/coordinate data produces generic, blobby
// shapes no matter how detailed the prompt or which model is used -- that's
// a ceiling of "draw with markup tokens," not a tuning problem. An actual
// image-generation model (diffusion/multimodal) is built for this task and
// produces real illustrated scenes instead.
// Docs: https://openrouter.ai/docs/guides/overview/multimodal/image-generation
const IMAGE_MODEL = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';

// Generated images are returned as base64 data URLs (often several hundred
// KB each). Storing that directly in the `stories.slides_with_art` JSONB
// column would bloat every story row and re-download the full blob on every
// page load. Instead, decode once and upload to Supabase Storage, then
// store just the public URL -- small DB rows, normal browser HTTP caching.
const STORAGE_BUCKET = 'story-art';

function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
    'X-Title': 'BookSphere'
  };
}

const MOOD_DESCRIPTIONS = {
  dawn: 'soft pink-gold dawn light, mist on the horizon, long gentle shadows',
  midday: 'bright harsh midday Chennai sun, high contrast, deep shadows',
  goldenHour: 'warm amber-gold late afternoon light, everything bathed in gold',
  night: 'deep Chennai night, sodium-lamp orange-yellow pools of light, deep navy sky',
  rain: 'northeast monsoon rain, dark grey-blue sky, wet reflective surfaces, dramatic atmosphere'
};

const POSE_DESCRIPTIONS = {
  standing: 'standing tall and composed, looking forward with quiet resolve',
  walking: 'walking purposefully forward',
  armsOpen: 'arms spread open, a posture of breakthrough and openness',
  slumped: 'shoulders slightly slumped, the weight of pressure showing',
  seated: 'seated, leaning forward in contemplation',
  none: null
};

const GENRE_PALETTES = {
  thriller: 'tense terracotta reds and deep navy shadows',
  romance: 'warm rose-pink and soft plum tones',
  psychological: 'muted violet and charcoal tones, introspective',
  'self-help': 'grounded forest green and warm cream tones',
  fantasy: 'deep indigo blue with soft luminous highlights',
  historical: 'aged ochre and sepia-gold tones',
  biography: 'warm olive-green and earthy tones',
  horror: 'desaturated wine-red and near-black shadow',
  comical: 'bright warm amber and playful gold',
  educational: 'clear teal-blue and clean light tones'
};

let bucketEnsured = false;

/**
 * Create the storage bucket once, on first use. Safe to call repeatedly --
 * an "already exists" error from Supabase is expected and ignored.
 */
async function ensureBucket() {
  if (bucketEnsured) return;
  try {
    await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: '6MB'
    });
  } catch (_) {
    // Already exists, or insufficient permission to create it (in which
    // case the upload call below will surface a clear error instead).
  }
  bucketEnsured = true;
}

/**
 * Generate a real illustrated scene image for one story slide via an actual
 * image-generation model, then persist it to Supabase Storage.
 * Returns a public image URL, or null if generation/upload fails (non-fatal
 * -- the client falls back to the existing hand-built scene_template).
 */
export async function generateSlideArt(slide, chennaiAreaData, bookGenre, storyId) {
  const moodDesc = MOOD_DESCRIPTIONS[slide.mood] || 'natural Chennai daylight';
  const poseDesc = POSE_DESCRIPTIONS[slide.figure_pose];

  const locationDesc = chennaiAreaData
    ? `${chennaiAreaData.name} in Chennai, India — ${chennaiAreaData.description}`
    : `a scene in Chennai, India (${String(slide.scene_template || 'a city street').replace(/_/g, ' ')})`;

  const palette = GENRE_PALETTES[bookGenre] || GENRE_PALETTES.educational;

  const prompt = `A cinematic, painterly concept-art illustration of ${locationDesc}. Lighting: ${moodDesc}. ${
    poseDesc ? `A single human figure in the lower third of the frame, seen from a moderate distance (not close-up, face not the focus), ${poseDesc}.` : 'A wide establishing shot with no human figure, focused entirely on the location.'
  } Mood and story moment: "${slide.slide_title}" — ${String(slide.content || '').substring(0, 160)}
Color palette: ${palette}. Style: atmospheric, warm, illustrated concept art with real depth and a genuine sense of place — like a frame from an animated film, not a stock photo, not a flat vector graphic, not a diagram. Wide cinematic framing.`;

  const SLIDE_ART_TIMEOUT_MS = 25000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SLIDE_ART_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: getHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        model: IMAGE_MODEL,
        modalities: ['image', 'text'],
        image_config: { aspect_ratio: '16:9' },
        // Route to whichever provider currently serves this model fastest.
        provider: { sort: 'throughput' },
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[sceneArtService] OpenRouter image error ${response.status}: ${errText.slice(0, 200)} — using fallback template`);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl || !imageUrl.startsWith('data:image/')) {
      console.warn('[sceneArtService] No image returned — using fallback template');
      return null;
    }

    // Decode the base64 data URL and upload it to Storage.
    const match = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      console.warn('[sceneArtService] Unexpected image data URL format — using fallback template');
      return null;
    }
    const [, mimeType, base64Data] = match;
    const ext = mimeType.split('/')[1] || 'png';
    const buffer = Buffer.from(base64Data, 'base64');

    await ensureBucket();
    const path = `${storyId}/slide-${slide.slide_number}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.warn(`[sceneArtService] Storage upload failed (${uploadError.message}) — using fallback template`);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return publicUrl;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[sceneArtService] Slide art generation timed out after ${SLIDE_ART_TIMEOUT_MS}ms — using fallback template`);
    } else {
      console.warn(`[sceneArtService] Scene art generation failed (${err.message}) — using fallback template`);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate AI scene art for all slides in parallel (max 5 concurrent).
 * Any slide that fails gets null -- the client falls back to the existing
 * hand-built template. Always non-fatal: story generation must never break
 * because of art generation.
 */
export async function generateAllSlideArt(slides, chennaiAreas, bookGenre, storyId) {
  const CONCURRENCY = 5;
  const results = new Array(slides.length).fill(null);
  let next = 0;

  const areaByTemplate = {};
  if (chennaiAreas && Array.isArray(chennaiAreas)) {
    for (const area of chennaiAreas) {
      const templateKey = area.name.toLowerCase().replace(/[\s,.']+/g, '_');
      areaByTemplate[templateKey] = area;
    }
  }

  async function worker() {
    while (next < slides.length) {
      const i = next++;
      const slide = slides[i];
      // Skip action plan slide (slide 6) — it shows the map, not an illustration
      if (slide.slide_number === 6) continue;

      const areaData = areaByTemplate[slide.scene_template] || null;
      results[i] = await generateSlideArt(slide, areaData, bookGenre, storyId);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}
