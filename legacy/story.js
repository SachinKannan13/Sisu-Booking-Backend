import express from 'express';
import crypto from 'crypto';
import supabase from '../database/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { getChennaiContext } from '../services/chennaiEngine.js';
import { generateStory } from '../services/claudeService.js';
import { generateAllSlideArt } from '../services/sceneArtService.js';

const router = express.Router();

// POST /api/story/generate
router.post('/generate', requireAuth, async (req, res) => {
  const { book_id } = req.body;
  let { inputs } = req.body;
  const userId = req.user.id;

  if (!book_id || !inputs) {
    return res.status(400).json({ error: 'book_id and inputs are required' });
  }

  // Get full book analysis
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', book_id)
    .eq('user_id', userId)
    .single();

  if (bookError || !book) return res.status(404).json({ error: 'Book not found' });
  if (book.status !== 'ready') return res.status(400).json({ error: 'Book is still processing' });

  // Fetch user profile and use it to fill in any wizard fields the user
  // left blank, so returning users don't have to re-explain their business
  // every time. Non-fatal if the profile doesn't exist yet.
  let userProfile = null;
  try {
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    userProfile = profileData;
  } catch (_) { /* no profile yet — fine */ }

  if (userProfile) {
    inputs = {
      ...inputs,
      step1: {
        businessName: userProfile.business_name || '',
        industry: userProfile.industry || '',
        stage: userProfile.stage || '',
        teamSize: userProfile.team_size || '',
        ...inputs.step1
      },
      step5: {
        ...inputs.step5,
        primaryArea: inputs.step5?.primaryArea || userProfile.preferred_chennai_area || ''
      }
    };
  }

  // Get Chennai context based on user inputs
  const scenario = [
    inputs.step1?.industry,
    inputs.step2?.mainChallenge,
    inputs.step2?.keepingUpAtNight
  ].filter(Boolean).join(' ');

  const primaryArea = inputs.step5?.primaryArea || '';
  const chennaiContext = await getChennaiContext(scenario, primaryArea);

  // Fetch route context for story scene transitions (non-fatal if none found
  // or if migrations_006_chennai_depth.sql hasn't been applied yet).
  let routeContext = '';
  try {
    if (primaryArea) {
      const { data: routes } = await supabase
        .from('chennai_routes')
        .select('from_area, to_area, travel_time_mins, route_description, weather_notes')
        .or(`from_area.ilike.%${primaryArea}%,to_area.ilike.%${primaryArea}%`)
        .limit(3);

      if (routes && routes.length > 0) {
        routeContext = routes.map(r =>
          `${r.from_area} -> ${r.to_area} (${r.travel_time_mins} min): ${r.route_description}${r.weather_notes ? ` Weather note: ${r.weather_notes}` : ''}`
        ).join('\n\n');
      }
    }
  } catch (_) { /* chennai_routes table may not exist yet — fine */ }

  // Generate story with Claude
  let story;
  try {
    story = await generateStory(book, inputs, chennaiContext, routeContext);
  } catch (err) {
    console.error('[story/generate] Claude error:', err.message);
    return res.status(500).json({ error: 'Story generation failed: ' + err.message });
  }

  // Generate AI scene art for each slide. This runs concurrently (5 at a
  // time) and is entirely non-fatal — failures just mean that slide uses
  // the existing scene-template component as a fallback on the client.
  // A storyId is generated up front (rather than waiting for the DB insert
  // below) so each slide's generated image has a stable Storage path before
  // the story row even exists — the same id is then used as the row's
  // explicit primary key on insert.
  console.log(`[story] Generating AI scene art for ${story.slides.length} slides...`);
  const storyId = crypto.randomUUID();

  let slidesWithArt = story.slides.map(slide => ({ ...slide, scene_image: null }));
  try {
    const { data: chennaiAreasData } = await supabase
      .from('chennai_areas')
      .select('name, description, storytelling_notes, tags')
      .limit(60);

    const slideArtResults = await generateAllSlideArt(story.slides, chennaiAreasData || [], book.genre, storyId);

    slidesWithArt = story.slides.map((slide, i) => ({
      ...slide,
      scene_image: slideArtResults[i] || null
    }));

    console.log(`[story] Scene art complete: ${slideArtResults.filter(Boolean).length}/${story.slides.length} slides generated`);
  } catch (err) {
    console.warn('[story] Scene art generation step failed entirely (non-fatal, using template fallback for all slides):', err.message);
  }

  // Save story to DB. The `slides_with_art` column only exists once
  // migrations_004_story_scene_art.sql has been run — until then, fall
  // back to saving without it rather than failing the whole request (the
  // story itself generated fine; we'd just be discarding the per-slide art
  // metadata, which the client can still receive in the response below).
  const isMissingSchema = (error) =>
    error && (
      ['PGRST204', 'PGRST205', '42P01'].includes(error.code) ||
      /schema cache|does not exist|could not find/i.test(error.message || '')
    );

  let { data: savedStory, error: saveError } = await supabase
    .from('stories')
    .insert({
      id: storyId,
      book_id,
      user_id: userId,
      story_title: story.story_title,
      input_data: inputs,
      slides: story.slides,
      slides_with_art: slidesWithArt,
      map_data: story.map_data,
      reading_time_estimate: story.reading_time_estimate
    })
    .select()
    .single();

  if (saveError && isMissingSchema(saveError)) {
    console.warn('[story/generate] slides_with_art column not found yet — run migrations_004_story_scene_art.sql. Saving without it for now.');
    const retry = await supabase
      .from('stories')
      .insert({
        id: storyId,
        book_id,
        user_id: userId,
        story_title: story.story_title,
        input_data: inputs,
        slides: story.slides,
        map_data: story.map_data,
        reading_time_estimate: story.reading_time_estimate
      })
      .select()
      .single();
    savedStory = retry.data;
    saveError = retry.error;
  }

  if (saveError) {
    console.error('[story/generate] Save error:', saveError.message);
    return res.status(500).json({ error: 'Failed to save story' });
  }

  res.json({
    id: savedStory.id,
    story_title: story.story_title,
    slides: story.slides,
    slides_with_art: slidesWithArt,
    map_data: story.map_data,
    reading_time_estimate: story.reading_time_estimate,
    created_at: savedStory.created_at
  });
});

// GET /api/story/:id
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Story not found' });
  res.json(data);
});

// GET /api/story/book/:bookId
router.get('/book/:bookId', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('stories')
    .select('id, story_title, reading_time_estimate, created_at')
    .eq('book_id', req.params.bookId)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

export default router;
