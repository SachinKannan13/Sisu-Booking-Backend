/**
 * Server-side scene registry — mirrors the client-side
 * client/src/features/simulation/scenes/registry.js but without
 * JSX components (we only need the metadata on the server side for
 * prompt generation).
 *
 * Keep this list in sync with the client registry.
 */
export const SCENE_METADATA = {
  marina_beach:              { tags: ['beach', 'iconic', 'dawn', 'perspective'] },
  nungambakkam_cafe:         { tags: ['cafe', 'creative', 'meetings', 'entrepreneurial'] },
  omr_tech_park:             { tags: ['it', 'tech', 'startup', 'growth', 'corporate'] },
  t_nagar_street:            { tags: ['commercial', 'business', 'shopping', 'bustling'] },
  mylapore_temple:           { tags: ['spiritual', 'ancient', 'cultural', 'traditional'] },
  adyar_theosophical:        { tags: ['peace', 'wisdom', 'nature', 'intellectual'] },
  besant_nagar_sunset:       { tags: ['beach', 'peaceful', 'romantic', 'sunset'] },
  chennai_central_station:   { tags: ['transport', 'historic', 'transition', 'interchange'] },
  anna_nagar_tower:          { tags: ['residential', 'startup', 'premium', 'family'] },
  valluvar_kottam:           { tags: ['cultural', 'outdoor', 'romantic', 'peaceful'] },
  ecr_coastal_road:          { tags: ['road', 'scenic', 'freedom', 'drive'] },
  generic_office:            { tags: ['corporate', 'startup', 'work', 'business'] },
  generic_home:              { tags: ['peaceful', 'reflective', 'residential', 'daily'] },
  generic_reflection:        { tags: ['peaceful', 'reflective', 'solitude', 'introspective'] },
  koyambedu_market:          { tags: ['market', 'bustling', 'wholesale', 'community'] },
  fort_st_george:            { tags: ['historic', 'government', 'cultural'] },
  iitm_research_park:        { tags: ['startup', 'incubator', 'tech', 'deeptech'] },
  mahabalipuram_shore_temple:{ tags: ['historic', 'ancient', 'beach', 'cultural'] },
  boardroom_pitch:           { tags: ['pitch', 'investor', 'meeting', 'high-stakes'] },
  monsoon_street:            { tags: ['rain', 'dramatic', 'transition', 'street'] },
  metro_train_interior:      { tags: ['transit', 'transition', 'momentum', 'urban'] },
  rooftop_night_view:        { tags: ['night', 'reflective', 'skyline', 'solitude'] },
  coworking_space:           { tags: ['startup', 'team', 'work', 'growth'] },
  sunrise_over_bay:          { tags: ['dawn', 'establishing', 'hope', 'wide'] },
};

/** Flat list of {id, tags} for prompt injection. */
export function getTemplateList() {
  return Object.entries(SCENE_METADATA).map(([id, t]) => ({ id, tags: t.tags }));
}

/** Validate a scene_key returned by the AI — fall back to generic_reflection. */
export function validateSceneKey(key) {
  return SCENE_METADATA[key] ? key : 'generic_reflection';
}
