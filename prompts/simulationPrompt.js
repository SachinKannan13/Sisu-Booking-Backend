import { LEARNING_OS_HEADER, LENSES, DEFAULT_LENS } from './learningModePrompts.js';
import { getTemplateList } from '../services/simulation/sceneRegistry.js';

/**
 * Build the simulation prompt — returns strict JSON shaped as the
 * SimulationResult type consumed by SimulationView.jsx.
 *
 * A simulation is a cinematic, multi-beat "what would it look like if I
 * lived this principle?" visualization grounded in the user's canon.
 *
 * @param {string} principle — the idea/moral/action being simulated
 * @param {string} chunks — formatted, attributed chunks from ragEngine
 * @param {string} lens — one of the LENSES keys
 * @param {string} chennaiContext — retrieved Chennai location description (optional)
 * @param {string} learningContext — "YOUR LEARNING JOURNEY" memory string (optional)
 */
export function buildSimulationPrompt(principle, chunks, lens = DEFAULT_LENS, chennaiContext = '', learningContext = '') {
  const lensConfig = LENSES[lens] || LENSES[DEFAULT_LENS];

  // Give the AI the full list of available scene templates so it can
  // pick valid scene_key values (keys from SCENE_TEMPLATES in registry.js)
  const templateList = (() => {
    try { return getTemplateList(); } catch { return []; }
  })();
  const templateBlock = templateList.length
    ? `AVAILABLE SCENE KEYS (pick only from this list for beat.scene_key):\n${templateList.map(t => `  ${t.id}: tags=[${t.tags.join(', ')}]`).join('\n')}`
    : 'SCENE KEYS: marina_beach | generic_reflection | generic_home | generic_office | rooftop_night_view | monsoon_street | sunrise_over_bay | mylapore_temple | coworking_space';

  const chennaiBlock = chennaiContext
    ? `CHENNAI / REAL-WORLD LOCATION CONTEXT (use for setting if the lens allows):\n${chennaiContext}`
    : '';

  return `${LEARNING_OS_HEADER}

${learningContext ? learningContext + '\n\n' : ''}MODE: SIMULATION — "What would it look like if I lived this principle?"
LENS: ${lensConfig.label} — ${lensConfig.frame}

You are generating a CINEMATIC SIMULATION of a principle from the user's Knowledge Canon.
The simulation shows — with vivid specificity — how living this idea would actually unfold across 4–6 story beats.
Each beat is grounded in a retrieved passage. The proof block explains WHY it works and HOW to verify it.

PRINCIPLE TO SIMULATE: ${principle}

RETRIEVED PASSAGES FROM KNOWLEDGE CANON:
${chunks || '[No passages retrieved — generate from general knowledge but note: "Not from retrieved passages"]'}

${chennaiBlock}

${templateBlock}

RULES:
1. Every beat must be grounded in a specific retrieved passage (cite in evidence field).
2. The beats together form a coherent arc: situation → friction → shift → outcome.
3. scene_key MUST be one of the keys from the list above — never invent new keys.
4. mood is one of: dawn | day | evening | night | monsoon
5. Lens = "${lensConfig.label}" — frame everything through: ${lensConfig.frame}. No unsolicited business framing for non-business lenses.
6. The proof block is the rigorous backbone — mechanism, evidence, falsification test. Make it substantive.
7. seven_day_experiment must be a concrete, specific action someone could start TODAY.

Return ONLY this exact JSON (no markdown, no preamble):
{
  "premise": "the principle being lived out, in one sentence, with attribution to its source",
  "lens": "${lens}",
  "setting": {
    "place": "a specific real-world location or context (e.g. a flat in Anna Nagar, a local market, a morning commute)",
    "scene_key": "one of the available scene keys above"
  },
  "beats": [
    {
      "title": "beat title (short, vivid)",
      "scene_key": "one of the available scene keys",
      "mood": "dawn | day | evening | night | monsoon",
      "narrative": "what happens in this beat — specific, sensory, grounded in the lens. 2–4 sentences.",
      "what_changes": "the observable change in behaviour, feeling, or outcome this beat produces",
      "evidence": "the retrieved passage or principle this beat is grounded in, with full attribution [Author, Title, Section]"
    }
  ],
  "predicted_outcome": "what the source material predicts will happen if this principle is lived out fully",
  "proof": {
    "mechanism": "WHY this works — the causal chain in 2–3 sentences",
    "leading_indicators": ["an observable early signal it is working", "another early signal"],
    "evidence_blocks": [{ "quote": "direct quote or near-quote from a retrieved passage", "source": "[Author, Title, Section]" }],
    "assumptions": ["a condition that must be true for this to hold"],
    "how_to_falsify": "the cheapest, fastest real-world test that could prove this wrong"
  },
  "seven_day_experiment": "one concrete, specific action the user can take THIS WEEK to begin living this principle — with a clear observable result",
  "save_insight_prompt": "a short insight worth saving to memory from this simulation, or empty string"
}`;
}
