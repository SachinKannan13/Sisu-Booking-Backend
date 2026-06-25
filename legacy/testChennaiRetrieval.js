import 'dotenv/config';
import { getChennaiContext } from '../services/chennaiEngine.js';

// Sanity-check script for Part 1c — run after seedChennai.js and
// embedChennaiAreas.js have both completed against your Supabase project.
//
//   cd server && node database/testChennaiRetrieval.js
//
// If pgvector/embeddings aren't set up yet, getChennaiContext() will log a
// warning and fall back to keyword search — this script still runs either way.

const scenarios = [
  { label: 'Scaling a SaaS team', scenario: 'I am struggling to scale my SaaS engineering team past 20 people without losing our startup culture and speed.', area: '' },
  { label: 'Losing a key investor', scenario: 'My lead investor just pulled out of our Series A two weeks before close and I do not know how to tell my co-founders.', area: '' },
  { label: 'Burnout before a product launch', scenario: 'I am completely burned out and exhausted but we launch our product in ten days and I cannot show any weakness to my team.', area: '' },
  { label: 'First hire as a solo founder', scenario: 'I have been a solo founder for a year and I am finally hiring my first employee and I am terrified of getting it wrong.', area: '' },
  { label: 'Pivoting after failure', scenario: 'Our original product idea failed in the market and we have three months of runway left to pivot to something that actually works.', area: 'Nungambakkam' }
];

async function run() {
  for (const { label, scenario, area } of scenarios) {
    console.log('\n' + '='.repeat(70));
    console.log(`SCENARIO: ${label}${area ? `  (requested area: ${area})` : ''}`);
    console.log('='.repeat(70));
    try {
      const context = await getChennaiContext(scenario, area);
      console.log(context);
    } catch (err) {
      console.error('Failed:', err.message);
    }
  }
  process.exit(0);
}

run();
