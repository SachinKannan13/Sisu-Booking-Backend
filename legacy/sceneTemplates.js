// Server-side mirror of client/src/components/storytelling/scenes/registry.js.
// Keep the IDs and tags here in sync with that file — this list is what gets
// embedded into the story-generation prompt so the LLM can only pick from
// templates that actually exist on the client.
export const SCENE_TEMPLATE_LIST = [
  { id: 'marina_beach', tags: ['beach', 'iconic', 'dawn', 'perspective'] },
  { id: 'nungambakkam_cafe', tags: ['cafe', 'creative', 'meetings', 'entrepreneurial', 'cosmopolitan'] },
  { id: 'omr_tech_park', tags: ['it', 'tech', 'startup', 'growth', 'corporate'] },
  { id: 't_nagar_street', tags: ['commercial', 'business', 'shopping', 'bustling', 'market'] },
  { id: 'mylapore_temple', tags: ['spiritual', 'ancient', 'cultural', 'traditional', 'historic'] },
  { id: 'adyar_theosophical', tags: ['peace', 'wisdom', 'nature', 'intellectual', 'peaceful'] },
  { id: 'besant_nagar_sunset', tags: ['beach', 'peaceful', 'romantic', 'sunset', 'relaxed'] },
  { id: 'chennai_central_station', tags: ['transport', 'historic', 'transition', 'interchange'] },
  { id: 'anna_nagar_tower', tags: ['residential', 'startup', 'premium', 'family', 'landmark'] },
  { id: 'valluvar_kottam', tags: ['cultural', 'outdoor', 'romantic', 'peaceful'] },
  { id: 'ecr_coastal_road', tags: ['road', 'scenic', 'freedom', 'drive'] },
  { id: 'generic_office', tags: ['it', 'corporate', 'startup', 'growth', 'business'] },
  { id: 'generic_home', tags: ['peaceful', 'reflective', 'residential'] },
  { id: 'generic_reflection', tags: ['peaceful', 'reflective', 'solitude', 'introspective'] },
  { id: 'koyambedu_market', tags: ['market', 'bustling', 'wholesale'] },
  { id: 'fort_st_george', tags: ['historic', 'government', 'cultural'] },
  { id: 'iitm_research_park', tags: ['startup', 'incubator', 'tech', 'serious', 'deeptech'] },
  { id: 'mahabalipuram_shore_temple', tags: ['historic', 'ancient', 'beach', 'cultural'] },
  { id: 'boardroom_pitch', tags: ['pitch', 'investor', 'meeting', 'high-stakes'] },
  { id: 'monsoon_street', tags: ['rain', 'dramatic', 'transition', 'street'] },
  { id: 'metro_train_interior', tags: ['transit', 'transition', 'momentum', 'urban'] },
  { id: 'rooftop_night_view', tags: ['night', 'reflective', 'skyline', 'solitude'] },
  { id: 'coworking_space', tags: ['startup', 'team', 'work', 'growth'] },
  { id: 'sunrise_over_bay', tags: ['dawn', 'establishing', 'hope', 'wide'] }
];

export const DEFAULT_SCENE_TEMPLATE = 'generic_reflection';

export const VALID_SCENE_TEMPLATE_IDS = new Set(SCENE_TEMPLATE_LIST.map(t => t.id));
export const VALID_MOODS = new Set(['dawn', 'midday', 'goldenHour', 'night', 'rain']);
export const VALID_FIGURE_POSES = new Set(['slumped', 'walking', 'armsOpen', 'seated', 'standing', 'none']);
