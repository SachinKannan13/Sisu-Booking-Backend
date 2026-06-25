import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================
// Supplementary Chennai dataset sourced from the official Tamil Nadu
// Tourism "Chennai" visitor map (Directorate of Tourism, Govt of Tamil
// Nadu) that the user uploaded. This file is ADDITIVE ONLY — unlike
// seedChennai.js, it does NOT delete existing rows. It only adds the
// landmarks/food/shopping spots from that map that are not already
// covered by seedChennai.js's ~150-entry dataset (checked by name
// against that file before writing this list).
//
// Coordinates are best-effort estimates for these well-documented public
// landmarks (the source PDF gives addresses/areas but not lat/lng).
// embedding is left NULL — run embedChennaiAreas.js afterward, same as
// every other seed file (it only embeds rows where embedding IS NULL,
// so it's safe to run repeatedly and only processes what's new).
// ============================================================

const newAreas = [

{ name: "Thousand Lights Mosque", area_type: "cultural", lat: 13.0566, lng: 80.2566,
  description: "A mosque spanning five acres in Royapettah, with a hall traditionally illuminated by a thousand lamps (giving it its name). Twin minarets and five inward-curving domes show clear Western Asian architectural influence.",
  tags: ["spiritual", "historic", "cultural"],
  storytelling_notes: "A striking, luminous backdrop for scenes about faith, patience, or a long-held tradition still burning bright.",
  time_context: { evening: "The hall's lamps are lit, illuminating the domes against the dusk sky." },
  micro_locations: [] },

{ name: "Kalakshetra Foundation", area_type: "cultural", lat: 12.9938, lng: 80.2580,
  description: "An arts and cultural academy in Thiruvanmiyur founded in 1936 by Rukmini Devi Arundale, dedicated to preserving Bharatanatyam dance and Gandharvaveda music in their traditional form.",
  tags: ["cultural", "traditional", "discipline", "mastery"],
  storytelling_notes: "Ideal for scenes about discipline, mastering a craft over years, or honoring a tradition while building something new.",
  time_context: { morning: "Students practicing mudras and adavus in open-sided halls, gentle rhythm of anklets and taps." },
  micro_locations: [] },

{ name: "Anna Centenary Library", area_type: "cultural", lat: 13.0210, lng: 80.2400,
  description: "Asia's second-largest library, in Kotturpuram, holding over 12 lakh volumes across 9 levels in Tamil and English, with dedicated sections for children, periodicals, rare books, and a photo library.",
  tags: ["intellectual", "quiet", "ambition", "knowledge"],
  storytelling_notes: "A vast, quiet space for scenes about research, deep focus, or a founder going back to first principles.",
  time_context: { afternoon: "Hushed reading floors, sunlight through tall windows, the occasional turning page." },
  micro_locations: [] },

{ name: "Gandhi Mandapam", area_type: "landmark", lat: 13.0107, lng: 80.2350,
  description: "A memorial complex near Guindy commemorating Mahatma Gandhi, set within green grounds and a frequent reference point for the Adyar/Kotturpuram area.",
  tags: ["historic", "reflective", "open"],
  storytelling_notes: "A grounded, reflective setting for scenes about conviction, principle, or staying the course under pressure.",
  time_context: {}, micro_locations: [] },

{ name: "Birla Planetarium", area_type: "landmark", lat: 13.0102, lng: 80.2358,
  description: "A planetarium in Kotturpuram offering sky shows and astronomy exhibits, a popular family and school-trip destination near the Anna Centenary Library.",
  tags: ["wonder", "education", "family"],
  storytelling_notes: "Good for breakthrough-insight scenes — looking up and seeing the bigger picture, literally.",
  time_context: {}, micro_locations: [] },

{ name: "St. Andrew's Church, Egmore", area_type: "cultural", lat: 13.0805, lng: 80.2605,
  description: "A 19th-century church in Egmore known for its distinctive circular design, one of the finest examples of colonial-era ecclesiastical architecture in the city.",
  tags: ["historic", "spiritual", "quiet"],
  storytelling_notes: "A calm, architecturally distinctive setting for moments of pause or quiet decision-making.",
  time_context: {}, micro_locations: [] },

{ name: "National Art Gallery, Egmore", area_type: "cultural", lat: 13.0710, lng: 80.2580,
  description: "Part of the Egmore museum complex, housing a collection of traditional and contemporary Indian art in a red Indo-Saracenic building.",
  tags: ["cultural", "creative", "historic"],
  storytelling_notes: "Scenes about creative inspiration, craftsmanship, or seeing an old problem through a new artistic lens.",
  time_context: {}, micro_locations: [] },

{ name: "Connemara Public Library, Egmore", area_type: "cultural", lat: 13.0712, lng: 80.2582,
  description: "One of the four National Depository Libraries in India, located within the Egmore museum complex, with an ornate reading hall and a vast periodicals collection.",
  tags: ["intellectual", "historic", "quiet"],
  storytelling_notes: "A research and study setting — good for scenes where the founder is digging for an answer in old records or precedent.",
  time_context: {}, micro_locations: [] },

{ name: "Victory War Memorial", area_type: "landmark", lat: 13.0850, lng: 80.2870,
  description: "A memorial near Fort St. George commemorating Indian soldiers of the First World War, a quiet historic monument on the Island Grounds side of the city.",
  tags: ["historic", "reflective", "solemn"],
  storytelling_notes: "Solemn, reflective backdrop for scenes about sacrifice, legacy, or honoring what came before.",
  time_context: {}, micro_locations: [] },

{ name: "Kalikambal Temple, George Town", area_type: "cultural", lat: 13.0918, lng: 80.2880,
  description: "A historic Hindu temple in the heart of George Town's commercial district, dedicated to the goddess Kalikambal, woven into the daily rhythm of Chennai's oldest trading quarter.",
  tags: ["spiritual", "commercial", "historic"],
  storytelling_notes: "Good for stories where commerce and faith intersect — a trader's quick prayer before a big deal.",
  time_context: { morning: "Traders stopping in before opening their shops nearby." },
  micro_locations: [] },

{ name: "Walajah Road Mosque (Big Mosque), Triplicane", area_type: "cultural", lat: 13.0560, lng: 80.2740,
  description: "A historic mosque on Triplicane's Walajah Road, one of the oldest and most prominent Islamic places of worship in the city.",
  tags: ["spiritual", "historic"],
  storytelling_notes: "A grounding location for quiet, faith-adjacent reflection scenes in the Triplicane area.",
  time_context: {}, micro_locations: [] },

{ name: "M.A. Chidambaram Stadium, Chepauk", area_type: "landmark", lat: 13.0627, lng: 80.2792,
  description: "Chennai's iconic cricket stadium on the Marina seafront, home ground of Chennai Super Kings — one of the city's most emotionally charged public spaces on a match night.",
  tags: ["sports", "iconic", "energy", "emotion"],
  storytelling_notes: "High-energy, crowd-roar backdrop for big-moment scenes — a launch night, a comeback, a stadium-sized swing in fortune.",
  time_context: { night: "Floodlights, roaring crowds, the city's attention narrowed to one ground." },
  micro_locations: [] },

{ name: "Napier Bridge", area_type: "landmark", lat: 13.0594, lng: 80.2800,
  description: "A landmark bridge over the Cooum river connecting Marina Beach to the Fort St. George area, a well-known visual gateway between old and new Chennai.",
  tags: ["landmark", "transition", "historic"],
  storytelling_notes: "A literal bridge — useful for transition scenes between two chapters of a business journey.",
  time_context: {}, micro_locations: [] },

{ name: "Memorials of Tamil Leaders, Marina", area_type: "landmark", lat: 13.0570, lng: 80.2810,
  description: "A row of memorials along Marina Beach honoring prominent Tamil political and literary leaders, a place where the city pauses to remember its own history.",
  tags: ["historic", "reflective", "public"],
  storytelling_notes: "Scenes about legacy, leadership, and what it means to be remembered for the right reasons.",
  time_context: {}, micro_locations: [] },

{ name: "Arignar Anna Zoological Park (Vandalur Zoo)", area_type: "nature", lat: 12.8825, lng: 80.0827,
  description: "India's largest zoological park, established in 1855, spread over 1,265 acres in Vandalur and home to 2,553 species of flora and fauna.",
  tags: ["nature", "family", "vast"],
  storytelling_notes: "Good for stories about scale, patience, and the slow cultivation of something large and living — a startup as an ecosystem, not a sprint.",
  time_context: { morning: "Coolest, most active hours for the animals; school groups arriving." },
  micro_locations: [] },

{ name: "Chetpet Eco Park", area_type: "nature", lat: 13.0700, lng: 80.2430,
  description: "A restored urban lake and green space in Chetpet, once a polluted waterbody, now a walking and birdwatching park in the middle of the city.",
  tags: ["nature", "renewal", "peaceful"],
  storytelling_notes: "A literal renewal story — useful for turnaround/comeback scenes, something broken brought back to life.",
  time_context: { evening: "Walkers circling the restored lake as the city noise fades behind the tree line." },
  micro_locations: [] },

{ name: "Chennai Rail Museum", area_type: "cultural", lat: 13.0735, lng: 80.2070,
  description: "A museum showcasing vintage locomotives and railway heritage of South India, a nostalgic stop for anyone interested in how the city's infrastructure was built.",
  tags: ["historic", "nostalgic", "infrastructure"],
  storytelling_notes: "Good for stories about infrastructure, foundational systems, or honoring the unglamorous groundwork behind a big success.",
  time_context: {}, micro_locations: [] },

{ name: "Vadapalani Murugan Temple", area_type: "cultural", lat: 13.0503, lng: 80.2127,
  description: "A major and heavily visited Murugan temple in Vadapalani, busy from early morning with devotees, especially on Tuesdays and Fridays.",
  tags: ["spiritual", "busy", "devotional"],
  storytelling_notes: "A devotional pit-stop scene before a big decision — asking for clarity, not just luck.",
  time_context: { morning: "Long devotee queues from before sunrise." },
  micro_locations: [] },

{ name: "Pulicat Lake", area_type: "nature", lat: 13.4167, lng: 80.1740,
  description: "India's second-largest brackish water lagoon, straddling the Tamil Nadu–Andhra Pradesh border about 60km from Chennai, with around 16 island villages and a major breeding ground for migratory and rare birds.",
  tags: ["nature", "remote", "vast", "birds"],
  storytelling_notes: "A far-from-the-noise reset scene — useful for a founder needing real distance from the business to see it clearly.",
  time_context: { dawn: "Flocks of flamingos and migratory birds lift off the water in the early light." },
  micro_locations: [] },

{ name: "Crocodile Bank, ECR", area_type: "nature", lat: 12.7160, lng: 80.2330,
  description: "A reptile conservation centre on the East Coast Road near Mamallapuram, breeding several species of Indian and international crocodiles and alligators in open, naturalistic pools.",
  tags: ["nature", "resilience", "patience"],
  storytelling_notes: "Good for stories about patience, resilience, and waiting out a long, slow-moving threat or challenge.",
  time_context: {}, micro_locations: [] },

{ name: "Dakshina Chitra Heritage Museum", area_type: "cultural", lat: 12.8255, lng: 80.2360,
  description: "A living-heritage museum near Muttukadu established by the Madras Craft Foundation, showcasing the art, craft, and architectural traditions of Tamil Nadu, Andhra Pradesh, Karnataka, and Kerala through working artisan exhibits.",
  tags: ["cultural", "craft", "traditional"],
  storytelling_notes: "Scenes about craftsmanship, regional identity, and building something rooted in genuine tradition rather than trend.",
  time_context: {}, micro_locations: [] },

{ name: "Vedanthangal Bird Sanctuary", area_type: "nature", lat: 12.5483, lng: 79.8620,
  description: "One of India's oldest bird sanctuaries, protected by the local community for over 250 years before being formally declared a reserve forest in 1962, near Madurantakam.",
  tags: ["nature", "remote", "legacy", "stewardship"],
  storytelling_notes: "A powerful setting for legacy and stewardship stories — something protected by ordinary people, long before it became official.",
  time_context: { dawn: "Peak birdwatching hours, with hundreds of migratory species visible at once." },
  micro_locations: [] },

{ name: "Kovalam Beach (Covelong)", area_type: "landmark", lat: 12.7900, lng: 80.2510,
  description: "A fishing village beach on the Bay of Bengal about 40km from Chennai on the way to Mamallapuram — Tamil Nadu's first internationally certified 'Blue Flag' beach, known for clean sands and eco-friendly bamboo huts.",
  tags: ["beach", "clean", "reset", "coastal"],
  storytelling_notes: "A deliberate, slightly further escape than Besant Nagar — good for a founder taking a real day off to reset before a hard decision.",
  time_context: { dawn: "Quiet, clean shoreline before the day's heat and crowds." },
  micro_locations: [] },

{ name: "Annai Velankanni Shrine, Besant Nagar", area_type: "cultural", lat: 12.9928, lng: 80.2710,
  description: "A prominent Catholic shrine in Besant Nagar near the coast, drawing devotees of multiple faiths for its association with Our Lady of Good Health.",
  tags: ["spiritual", "coastal", "devotional"],
  storytelling_notes: "A quiet, hopeful setting near the sea for scenes of seeking reassurance before a leap of faith.",
  time_context: {}, micro_locations: [] },

{ name: "Ashtalakshmi Temple, Besant Nagar", area_type: "cultural", lat: 13.0010, lng: 80.2735,
  description: "A multi-storeyed temple on the Besant Nagar coastline dedicated to the eight forms of Goddess Lakshmi, with the Bay of Bengal as a backdrop.",
  tags: ["spiritual", "coastal", "abundance"],
  storytelling_notes: "Fitting backdrop for scenes about seeking prosperity or abundance with the sea as a witness.",
  time_context: { evening: "Sea breeze, temple lights reflecting toward the water." },
  micro_locations: [] },

{ name: "Kasimedu Fishing Harbour", area_type: "landmark", lat: 13.1280, lng: 80.2980,
  description: "Chennai's main fishing harbour in the north of the city, alive before dawn with boats returning, auctioneers, and the freshest catch of the day.",
  tags: ["industrious", "raw", "early-morning"],
  storytelling_notes: "Raw, unfiltered hustle — good for scenes about the unglamorous, physical side of building something from nothing.",
  time_context: { dawn: "Boats returning, shouted auctions, the day's catch sorted on the dock." },
  micro_locations: [] },

{ name: "Pallikaranai Marsh", area_type: "nature", lat: 12.9380, lng: 80.2150,
  description: "One of the last surviving natural wetlands in Chennai, alongside the OMR IT corridor, an important habitat for migratory birds and a quiet contrast to the glass towers next to it.",
  tags: ["nature", "contrast", "perspective"],
  storytelling_notes: "A striking contrast scene — wild, slow nature running directly alongside the fastest-moving part of the city's economy.",
  time_context: { evening: "Birds settling in as IT-corridor traffic roars past just metres away." },
  micro_locations: [] },

{ name: "Woodlands, Mylapore", area_type: "food", lat: 13.0345, lng: 80.2680,
  description: "A long-running South Indian vegetarian restaurant in Mylapore known for its traditional meals, a fixture of the neighbourhood's food culture.",
  tags: ["food", "traditional", "south-indian"],
  storytelling_notes: "A reliable, old-Chennai meal scene — comfort food before or after a hard conversation.",
  time_context: {}, micro_locations: [] },

{ name: "Buhari Restaurant", area_type: "food", lat: 13.0580, lng: 80.2580,
  description: "A long-established Chennai restaurant chain known for biryani and North Indian-influenced dishes, a familiar name across the city's food scene.",
  tags: ["food", "biryani", "established"],
  storytelling_notes: "A casual, dependable meeting-over-food scene.",
  time_context: {}, micro_locations: [] },

{ name: "Savya Rasa, Adyar", area_type: "food", lat: 13.0020, lng: 80.2560,
  description: "A well-regarded Chettinad restaurant in Adyar serving traditional Tamil Nadu cuisine known for its bold spicing and signature dishes.",
  tags: ["food", "chettinad", "traditional"],
  storytelling_notes: "Good for a celebratory or reflective meal scene rooted in regional identity.",
  time_context: {}, micro_locations: [] },

{ name: "Saravana Bhavan, T. Nagar", area_type: "food", lat: 13.0420, lng: 80.2330,
  description: "One of the most recognised South Indian vegetarian restaurant chains in the world, originating in Chennai, known for sambar vadai and consistent quality.",
  tags: ["food", "south-indian", "iconic"],
  storytelling_notes: "A familiar, almost ritual meal stop in the middle of T. Nagar's chaos.",
  time_context: {}, micro_locations: [] },

{ name: "Ambur Star Biryani", area_type: "food", lat: 13.0480, lng: 80.2200,
  description: "A Chennai outpost of the Ambur-style biryani tradition, known for its distinct short-grain rice and seeraga samba preparation.",
  tags: ["food", "biryani", "regional"],
  storytelling_notes: "A hearty, working-lunch scene with a strong regional identity.",
  time_context: {}, micro_locations: [] },

{ name: "Co-Optex, Chennai", area_type: "shopping", lat: 13.0620, lng: 80.2620,
  description: "The Tamil Nadu Handloom Weavers' Cooperative Society's flagship retail outlet, selling authentic silk and cotton sarees, dhotis, and home textiles woven by the state's traditional weaver cooperatives.",
  tags: ["shopping", "handloom", "traditional"],
  storytelling_notes: "Good for scenes about supporting traditional livelihoods, or a founder buying something for a milestone occasion.",
  time_context: {}, micro_locations: [] },

{ name: "Higginbotham's, Anna Salai", area_type: "shopping", lat: 13.0610, lng: 80.2615,
  description: "One of India's oldest bookstores, founded in Chennai in 1844, still operating on Anna Salai with a strong stock of English and regional-language titles.",
  tags: ["shopping", "books", "intellectual", "historic"],
  storytelling_notes: "A browsing scene for a founder looking for the right book at the right moment — fitting, given the app's own premise.",
  time_context: {}, micro_locations: [] },

{ name: "Poompuhar Handicrafts", area_type: "shopping", lat: 13.0590, lng: 80.2610,
  description: "The retail brand of the Tamil Nadu Handicrafts Development Corporation (est. 1973), selling bronze and wooden statues and intricate traditional art pieces made by native Tamil Nadu craftsmen.",
  tags: ["shopping", "craft", "traditional"],
  storytelling_notes: "A gift-buying scene with real craftsmanship behind it — good for closing a story on a note of gratitude.",
  time_context: {}, micro_locations: [] },

{ name: "George Town Flower Market", area_type: "shopping", lat: 13.0950, lng: 80.2850,
  description: "A wholesale flower market in George Town trading in jasmine (mallipoo) and garlands (kadhambam), busy from before dawn with vendors restocking temples and weddings across the city.",
  tags: ["shopping", "flowers", "early-morning", "fragrant"],
  storytelling_notes: "A fragrant, sensory-rich opening scene — the smell of jasmine before the rest of the city wakes up.",
  time_context: { dawn: "Flower sellers sorting jasmine strings by lamplight before sunrise." },
  micro_locations: [] },

];

async function seed() {
  console.log(`Adding ${newAreas.length} new Chennai tourism locations (from the official TN Tourism map)...`);

  // Additive only -- does NOT delete existing rows (unlike seedChennai.js).
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < newAreas.length; i += BATCH_SIZE) {
    const batch = newAreas.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from('chennai_areas').insert(batch).select();
    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      process.exit(1);
    }
    inserted += data.length;
    console.log(`  ...inserted ${inserted}/${newAreas.length}`);
  }

  console.log(`Successfully added ${inserted} new Chennai locations.`);
  console.log(`Next: run "node database/embedChennaiAreas.js" to backfill semantic embeddings for these new rows.`);
  process.exit(0);
}

seed();
