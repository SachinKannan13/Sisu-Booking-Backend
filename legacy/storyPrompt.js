import { SCENE_TEMPLATE_LIST } from '../data/sceneTemplates.js';

export function buildStoryPrompt(book, inputs, chennaiContext, routeContext = '') {
  const { step1, step2, step3, step4, step5 } = inputs;

  const templateListText = SCENE_TEMPLATE_LIST
    .map(t => `- "${t.id}" — tags: ${t.tags.join(', ')}`)
    .join('\n');

  return `You are a master storyteller and business narrative architect. Your task is to create a deeply personal, cinematic 6-slide story that places the user INSIDE the wisdom of the book "${book.title}" by ${book.author}, set entirely in Chennai, India.

BOOK DATA:
Title: ${book.title}
Author: ${book.author}
Genre: ${book.genre}
Summary: ${book.summary}
Key Themes: ${JSON.stringify(book.themes || [])}
Key Frameworks: ${JSON.stringify((book.key_frameworks || []).slice(0, 4))}
Business Insights: ${JSON.stringify((book.business_insights || []).slice(0, 5))}
Key Characters: ${JSON.stringify((book.characters || []).slice(0, 3))}
Tone: ${book.tone || 'thoughtful and engaging'}

USER PROFILE:
Business Name: ${step1?.businessName || 'their startup'}
Industry: ${step1?.industry || 'technology'}
Stage: ${step1?.stage || 'growing'}
Team Size: ${step1?.teamSize || 'small'}

Current Challenge: ${step2?.mainChallenge || 'scaling the business'}
Keeping Up At Night: ${step2?.keepingUpAtNight || 'uncertainty about the future'}

Book Resonance: ${step3?.resonance || 'The core framework from this book'}
Why It Resonates: ${step3?.explanation || 'It mirrors my current situation'}

Key People: ${step4?.keyPeople || 'co-founder and team'}
Urgency: ${step4?.urgency || 'this quarter'}
Success Vision: ${step4?.successVision || 'a thriving, profitable business'}

Chennai Primary Area: ${step5?.primaryArea || 'Nungambakkam'}
Specific Venue: ${step5?.specificVenue || 'a Chennai café'}
Story Tone: ${step5?.storyTone || 'Cinematic'}

CHENNAI LOCATION CONTEXT:
${chennaiContext}
${routeContext ? `\nCHENNAI ROUTE CONTEXT (use for scene transitions between locations, and to ground travel between slides in real geography):\n${routeContext}\n` : ''}
STORY REQUIREMENTS:
- Exactly 6 slides
- Each slide: 150-200 words of immersive narrative prose
- Written in second person ("you walk into...", "you feel...")
- Deeply personal: use the actual business name, actual challenge, actual Chennai location
- Reflect the book's genre voice and emotional tone (${book.genre})
- Ground EVERY scene in real Chennai geography, culture, food, transport, sounds
- Show HOW the book's specific wisdom plays out in their startup context
- Feel like a movie with a protagonist (the user) who grows through the story
- Let the urgency (${step4?.urgency || 'this quarter'}) shape the story's pacing and stakes

SLIDE STRUCTURE:
Slide 1 — "The Scene": The user in Chennai, at their specific location, facing their challenge. Full sensory detail — sounds, smells, light, texture. Make it feel real. End with the problem crystallizing.

Slide 2 — "[Choose a title that references the book's core concept]": The book's central idea is introduced through a Chennai moment that perfectly mirrors their situation. Draw a specific parallel between the book and their business reality.

Slide 3 — "[Choose a tension title]": The challenge escalates using the book's framework. Show the stakes becoming clear. The user sees their situation with new eyes. This is the darkest moment before insight.

Slide 4 — "[Choose a breakthrough title]": The key insight lands — specifically, concretely. Show exactly HOW they apply this book's wisdom to their specific challenge. Make it feel inevitable in retrospect.

Slide 5 — "The Way Forward": Resolution. Show what their startup looks like with this wisdom applied. Ground it in Chennai — a specific place, a specific moment of recognition. Hope, but earned.

Slide 6 — "Your Action Plan": 4 concrete, specific, time-bound actions. Each references the book, each has a Chennai context, each has a clear timeline.

SCENE SELECTION (for each slide):
Instead of drawing artwork, choose a pre-built animated scene template for
each slide from this exact list (choosing anything not on this list is invalid):
${templateListText}

For each slide, also choose:
- "mood": one of dawn | midday | goldenHour | night | rain — based on the
  story's pacing (dawn/hope for opening, midday for tension, goldenHour for
  breakthrough/resolution, night for high-stakes, rain optional for dramatic
  emphasis).
- "figure_pose": one of slumped | walking | armsOpen | seated | standing | none
  — matched to the emotional beat: slumped (tension/struggle), armsOpen
  (breakthrough), walking (forward motion), seated (reflection), standing
  (resolve), none (wide establishing shots).

Choose the scene_template whose tags best match this slide's location and
emotional beat. Prefer a template whose tags overlap with the Chennai
location context provided above (especially anything matching
${step5?.primaryArea || 'Nungambakkam'}); fall back to "generic_office" or
"generic_home" for interior/reflective beats that have no specific outdoor
location, and to "generic_reflection" only as a last resort.

JSON SAFETY (critical — broken JSON here fails the whole request): every
"content" field below is a JSON string. If any sentence includes quoted
speech or a quoted word, use single quotes ('like this') — NEVER literal
double-quote characters ("like this") — since an unescaped " inside a JSON
string breaks parsing. Write each "content" value as one continuous line
with no literal line breaks (use a space or " — " between beats instead of
a newline).

Return ONLY valid JSON. No markdown. No explanation. Just the raw JSON:
{
  "story_title": "[Cinematic title for this personal story — reference both the book and the user's business]",
  "slides": [
    {
      "slide_number": 1,
      "slide_title": "[slide title]",
      "content": "[150-200 word immersive narrative prose in second person]",
      "scene_template": "[template id from the list above]",
      "mood": "[dawn|midday|goldenHour|night|rain]",
      "figure_pose": "[slumped|walking|armsOpen|seated|standing|none]"
    },
    {
      "slide_number": 2,
      "slide_title": "[slide title]",
      "content": "[150-200 word immersive narrative prose]",
      "scene_template": "[template id from the list above]",
      "mood": "[dawn|midday|goldenHour|night|rain]",
      "figure_pose": "[slumped|walking|armsOpen|seated|standing|none]"
    },
    {
      "slide_number": 3,
      "slide_title": "[slide title]",
      "content": "[150-200 word immersive narrative prose]",
      "scene_template": "[template id from the list above]",
      "mood": "[dawn|midday|goldenHour|night|rain]",
      "figure_pose": "[slumped|walking|armsOpen|seated|standing|none]"
    },
    {
      "slide_number": 4,
      "slide_title": "[slide title]",
      "content": "[150-200 word immersive narrative prose]",
      "scene_template": "[template id from the list above]",
      "mood": "[dawn|midday|goldenHour|night|rain]",
      "figure_pose": "[slumped|walking|armsOpen|seated|standing|none]"
    },
    {
      "slide_number": 5,
      "slide_title": "The Way Forward",
      "content": "[150-200 word resolution narrative]",
      "scene_template": "[template id from the list above]",
      "mood": "[dawn|midday|goldenHour|night|rain]",
      "figure_pose": "[slumped|walking|armsOpen|seated|standing|none]"
    },
    {
      "slide_number": 6,
      "slide_title": "Your Action Plan",
      "content": "[action plan as JSON array of 4 objects: {step_number, action, timeline, book_reference, chennai_context}]",
      "scene_template": "[template id — this will be replaced by the Chennai map anyway]",
      "mood": "goldenHour",
      "figure_pose": "none"
    }
  ],
  "map_data": {
    "story_locations": [
      {
        "name": "[location name]",
        "lat": [latitude as number],
        "lng": [longitude as number],
        "note": "[brief note on what happens here in the story]",
        "slide_reference": [slide number as integer]
      }
    ]
  },
  "reading_time_estimate": "[e.g. '4 minutes']"
}`;
}
