import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================
// Deep Chennai location dataset for BookSphere storytelling.
// Names verified against Wikipedia / Chennai Metro Rail Ltd /
// public tourism sources. Coordinates for major, well-documented
// landmarks are taken from those sources; coordinates for smaller
// streets/stations/colleges are best-effort estimates consistent
// with their known locality (same convention as the original
// 23-entry seed). embedding column is left NULL here — run
// embedChennaiAreas.js afterward to backfill semantic vectors.
// ============================================================

const chennaiAreas = [

// ───────────────────────── NEIGHBORHOODS ─────────────────────────
{ name: "Anna Nagar", area_type: "neighborhood", lat: 13.0850, lng: 80.2101,
  description: "Upscale planned residential area, popular with business professionals and startup founders. Wide tree-lined avenues, good cafes, peaceful environment for reflection.",
  tags: ["residential", "startup", "premium", "family"],
  storytelling_notes: "Perfect for morning walks before big decisions. The Anna Nagar Tower is a landmark. Strong sense of established success.",
  time_context: { dawn: "Walkers and joggers circle the tower park before the heat sets in.", morning: "School traffic, tiffin-center queues, the smell of filter coffee from corner shops.", afternoon: "Quiet residential streets, shuttered shopfronts, ceiling fans humming.", evening: "Tower Park fills with families, badminton games, vendors selling sundal.", night: "Well-lit avenues, late dinners at Thillai's or Buhari's, quiet by 11pm." },
  micro_locations: [ { name: "Anna Nagar Tower Park", note: "Central green space, evening gathering point." }, { name: "2nd Avenue shopping stretch", note: "Cafes, bakeries, boutique stores." } ] },

{ name: "T. Nagar", area_type: "neighborhood", lat: 13.0418, lng: 80.2341,
  description: "Chennai's commercial heart. Crowded, energetic, full of small businesses, textile shops, and Pondy Bazaar. The pulse of middle-class Chennai entrepreneurship.",
  tags: ["commercial", "business", "shopping", "bustling"],
  storytelling_notes: "Great for stories about hustle, competition, market dynamics. The noise and energy mirrors the chaos of early startup life.",
  time_context: { dawn: "Shutters still down, only flower-sellers setting up at Panagal Park.", morning: "Delivery trucks double-parked, shopkeepers sweeping doorsteps.", afternoon: "Peak crowd, traffic gridlock, the smell of street food.", evening: "Pondy Bazaar pedestrian street fully alive — bargaining, lights, crowds.", night: "Shops pull down shutters by 10pm, autos still circling for fares." },
  micro_locations: [ { name: "Pondy Bazaar pedestrian stretch", note: "Iconic shopping street, bargaining culture." }, { name: "Panagal Park", note: "Small central park, meeting point." }, { name: "Ranganathan Street", note: "Most crowded shopping lane in South India." } ] },

{ name: "Nungambakkam", area_type: "neighborhood", lat: 13.0580, lng: 80.2414,
  description: "Cosmopolitan, artsy, home to embassies and upscale restaurants. The creative and intellectual hub of Chennai. Many consultant offices here.",
  tags: ["cosmopolitan", "creative", "cafes", "professional"],
  storytelling_notes: "Ideal for strategic conversations, pivotal meetings, breakthrough ideas over coffee. Amethyst and other landmark cafes are here.",
  time_context: { dawn: "Quiet leafy streets, walkers near the Income Tax office grounds.", morning: "Office crowd arriving, valets opening cafe shutters.", afternoon: "Business lunches, consultants on laptops in cafe courtyards.", evening: "Khader Nawaz Khan Road comes alive — boutiques, bars, string lights.", night: "A handful of restaurants and bars stay lively past 10pm." },
  micro_locations: [ { name: "Khader Nawaz Khan Road", note: "Boutique shopping and dining street." }, { name: "Amethyst courtyard", note: "Landmark café in a converted colonial bungalow." } ] },

{ name: "Adyar", area_type: "neighborhood", lat: 13.0012, lng: 80.2565,
  description: "Quiet, intellectual, bookish. Home to the Theosophical Society's vast gardens. IT professionals, professors, and thoughtful people live here.",
  tags: ["peaceful", "intellectual", "it-crowd", "residential"],
  storytelling_notes: "Perfect for introspective moments, mentorship scenes, and stories about wisdom and long-term thinking.",
  time_context: { dawn: "Mist over the Adyar river, walkers near the bridge.", morning: "School buses, the Gandhi Nagar market opening.", afternoon: "Shaded streets, quiet bookstores.", evening: "Families at Adyar bridge watching the sunset over the estuary.", night: "Residential calm returns early." },
  micro_locations: [ { name: "Adyar bridge", note: "River-estuary views, popular evening spot." }, { name: "Gandhi Nagar market", note: "Local shopping and produce." } ] },

{ name: "Mylapore", area_type: "neighborhood", lat: 13.0368, lng: 80.2676,
  description: "The cultural soul of Chennai. Ancient temples, classical music, Brahmin quarter, Kapaleeshwarar Temple. Where tradition meets ambition.",
  tags: ["cultural", "traditional", "spiritual", "historic"],
  storytelling_notes: "Powerful for stories involving legacy, values, family business tension, or reconnecting with roots amid startup pressure.",
  time_context: { dawn: "Temple bells, jasmine-flower vendors setting up on Kapaleeshwarar Sannathi Street.", morning: "Filter-coffee crowds at Karpagambal Mess.", afternoon: "Quiet lanes, the temple tank still and reflective.", evening: "Bustling Sannathi Street, kolam chalk powder vendors, temple lights.", night: "Margazhi-season concerts at nearby sabhas in December." },
  micro_locations: [ { name: "Kapaleeshwarar Temple tank", note: "Sacred tank, quiet reflection spot." }, { name: "Sannathi Street", note: "Flower and ritual-goods market lane." } ] },

{ name: "Besant Nagar", area_type: "neighborhood", lat: 12.9994, lng: 80.2674,
  description: "Breezy, beach-adjacent suburb. Elliot's Beach is a calm haven. Young professionals, creatives, and weekend warriors come here to decompress.",
  tags: ["beach", "young", "creative", "relaxed"],
  storytelling_notes: "Evening beach walks for clarity. Stories of reflection, letting go of a bad idea, or finding inspiration by the sea.",
  time_context: { dawn: "Joggers and yoga groups on the sand before sunrise heat.", morning: "Quiet cafes opening along 5th Avenue.", afternoon: "Hot, mostly empty beach.", evening: "Couples, families, sundal and bajji carts, kite flying.", night: "Beach cleared by police past 10pm, restaurants on 5th Avenue stay open." },
  micro_locations: [ { name: "Karl Schmidt Memorial (Vivekananda statue point)", note: "Iconic beach landmark." }, { name: "5th Avenue restaurant row", note: "Cafes and casual dining street." } ] },

{ name: "OMR (Old Mahabalipuram Road)", area_type: "neighborhood", lat: 12.9254, lng: 80.2168,
  description: "Chennai's IT corridor. Miles of tech parks, startup offices, coworking spaces. Fast-paced, growth-oriented, global in culture.",
  tags: ["it", "startup", "tech", "growth"],
  storytelling_notes: "Ideal for growth-stage startup stories, scaling challenges, team dynamics in large offices, IPO dreams.",
  time_context: { dawn: "Empty highway, a few early shift cabs.", morning: "Bumper-to-bumper IT shuttle traffic.", afternoon: "Food court rush in tech park lobbies.", evening: "Office exodus, traffic jams stretching for kilometers.", night: "Late shift teams, lit-up tech park towers against the dark highway." },
  micro_locations: [ { name: "Tidel Park signal", note: "Iconic traffic landmark and meeting reference point." }, { name: "Sholinganallur junction", note: "Major IT-corridor bottleneck." } ] },

{ name: "Velachery", area_type: "neighborhood", lat: 12.9757, lng: 80.2209,
  description: "Rapidly growing suburb with Phoenix MarketCity, IT parks, and strong middle-class energy. The ambition of new Chennai.",
  tags: ["growing", "middle-class", "it", "ambition"],
  storytelling_notes: "First-generation entrepreneur stories. Making it from a small start to something significant.",
  time_context: { dawn: "Quiet around Velachery lake, a few walkers.", morning: "School and office traffic converging on 100 Feet Road.", afternoon: "Mall food courts filling up.", evening: "Phoenix MarketCity crowds, lake-side walkers.", night: "Multiplex crowds spilling onto 100 Feet Road." },
  micro_locations: [ { name: "Velachery Lake walkway", note: "Restored urban lake, evening walking track." }, { name: "Phoenix MarketCity", note: "Major mall, meeting and leisure spot." } ] },

{ name: "Egmore", area_type: "neighborhood", lat: 13.0789, lng: 80.2635,
  description: "Old-world business district with government offices, courts, and established firms. History and bureaucracy meet ambition.",
  tags: ["government", "established", "business", "historic"],
  storytelling_notes: "Stories involving regulatory challenges, legacy businesses, perseverance through red tape.",
  time_context: { dawn: "Egmore station platforms stirring with early arrivals.", morning: "Government office queues forming.", afternoon: "Lawyers and clerks moving between court buildings.", evening: "Station rush, vendors near the museum.", night: "Quiet but for late trains departing Egmore station." },
  micro_locations: [ { name: "Government Museum, Egmore", note: "Colonial-era museum complex." }, { name: "Egmore railway station forecourt", note: "Historic terminus, constant motion." } ] },

{ name: "Porur", area_type: "neighborhood", lat: 13.0359, lng: 80.1572,
  description: "Western Chennai gateway, home to large IT campuses and the Porur lake. Long commutes, determination, suburban hustle.",
  tags: ["it", "suburban", "growth"],
  storytelling_notes: "The long drive on the highway as a metaphor for persistence. Campus culture, early mornings.",
  time_context: { dawn: "Mist over Porur lake, walkers on the lake-bund road.", morning: "Heavy commuter traffic toward IT campuses.", afternoon: "Quiet residential lanes off the main road.", evening: "Lake-bund crowds, food stalls.", night: "Highway traffic thins, campus buses still running." },
  micro_locations: [ { name: "Porur Lake bund road", note: "Walking and jogging track around the lake." } ] },

{ name: "Mogappair", area_type: "neighborhood", lat: 13.0680, lng: 80.1780,
  description: "Densely packed western residential suburb, popular with middle-class families and small business owners. Anna Nagar's quieter, more affordable neighbor.",
  tags: ["residential", "middle-class", "family"],
  storytelling_notes: "First-apartment stories, small-business-from-home beginnings.",
  time_context: { morning: "School-run traffic on narrow lanes.", evening: "Local market street busy with shoppers." },
  micro_locations: [ { name: "Mogappair West market street", note: "Local shops and eateries." } ] },

{ name: "Ashok Nagar", area_type: "neighborhood", lat: 13.0381, lng: 80.2126,
  description: "Established middle-class neighborhood near T. Nagar, with the Ashok Nagar metro station and a strong local market culture.",
  tags: ["residential", "middle-class", "commercial"],
  storytelling_notes: "Stories of steady, unglamorous progress — the long middle of a founder's journey.",
  time_context: { morning: "Vendors setting up near the metro station.", evening: "Local shopping street crowds." },
  micro_locations: [ { name: "Ashok Nagar metro station area", note: "Elevated station, local commerce around it." } ] },

{ name: "Kodambakkam", area_type: "neighborhood", lat: 13.0512, lng: 80.2228,
  description: "Once the heart of the Tamil film industry ('Kodambakkam' is shorthand for Tamil cinema), now a dense residential-commercial mix.",
  tags: ["historic", "creative", "residential", "commercial"],
  storytelling_notes: "Stories about creative ambition, the entertainment-meets-business crowd, faded glamour reinvented.",
  time_context: { morning: "Old film-studio lanes now bustling with small offices.", evening: "Arcot Road traffic and shopfronts lit up." },
  micro_locations: [ { name: "Arcot Road", note: "Major commercial spine of Kodambakkam." } ] },

{ name: "Vadapalani", area_type: "neighborhood", lat: 13.0503, lng: 80.2126,
  description: "Busy junction neighborhood, home to the Vadapalani Murugan Temple and a Chennai Metro station on the Green Line.",
  tags: ["commercial", "spiritual", "transit"],
  storytelling_notes: "A crossroads neighborhood — literal and metaphorical decision points.",
  time_context: { morning: "Temple crowds and metro commuters mixing.", evening: "Junction traffic, street-food stalls near the temple." },
  micro_locations: [ { name: "Vadapalani Murugan Temple", note: "Major neighborhood temple." } ] },

{ name: "Thiruvanmiyur", area_type: "neighborhood", lat: 12.9830, lng: 80.2592,
  description: "Coastal suburb south of Besant Nagar, popular with IT professionals and known for its laid-back, leafy character and proximity to the beach.",
  tags: ["residential", "it-crowd", "beach", "relaxed"],
  storytelling_notes: "Quiet-confidence stories — the founder who has settled into a rhythm rather than chasing chaos.",
  time_context: { dawn: "Beach walkers near Thiruvanmiyur beach.", evening: "Quiet residential streets, small eateries filling up." },
  micro_locations: [ { name: "Thiruvanmiyur beach", note: "Quieter than Besant Nagar, fewer crowds." } ] },

{ name: "Perungudi", area_type: "neighborhood", lat: 12.9647, lng: 80.2425,
  description: "OMR-adjacent residential and IT-park area, known for newer apartment complexes and a mix of office and family life.",
  tags: ["it", "residential", "growing"],
  storytelling_notes: "Work-life balance tension stories — the apartment ten minutes from the office that's never quite enough distance.",
  time_context: { morning: "IT-park-bound traffic merging onto OMR.", evening: "New apartment-complex crowds, small restaurants opening." },
  micro_locations: [] },

{ name: "Sholinganallur", area_type: "neighborhood", lat: 12.9010, lng: 80.2279,
  description: "Major OMR IT hub junction, dense with tech parks, startups, and a famously congested signal that's a local landmark in its own right.",
  tags: ["it", "startup", "growth", "bustling"],
  storytelling_notes: "The traffic jam as forced reflection time — many founder epiphanies happen stuck at this signal.",
  time_context: { morning: "Gridlock of IT shuttle buses and two-wheelers.", evening: "Same gridlock, reversed direction." },
  micro_locations: [ { name: "Sholinganallur signal", note: "Notorious traffic junction, OMR's busiest." } ] },

{ name: "Tambaram", area_type: "neighborhood", lat: 12.9249, lng: 80.1000,
  description: "Major southwestern suburb and railway/transit hub, historically a British cantonment town, now a dense residential and educational area.",
  tags: ["residential", "transit", "historic", "educational"],
  storytelling_notes: "Stories of starting from the outskirts and working inward — geographically and professionally.",
  time_context: { morning: "Suburban rail commuters flooding the station.", evening: "Market street near the station, college students passing through." },
  micro_locations: [ { name: "Tambaram railway station", note: "Major suburban rail terminus." } ] },

{ name: "Royapettah", area_type: "neighborhood", lat: 13.0524, lng: 80.2649,
  description: "Dense, historic central neighborhood near Anna Salai, with a strong mixed commercial and residential character.",
  tags: ["historic", "commercial", "residential"],
  storytelling_notes: "Old-Chennai-grit stories — businesses that have survived decades of change.",
  time_context: { evening: "Anna Salai-adjacent traffic, small shops closing late." },
  micro_locations: [] },

{ name: "Triplicane", area_type: "neighborhood", lat: 13.0569, lng: 80.2786,
  description: "One of Chennai's oldest residential neighborhoods, beside the Parthasarathy Temple and close to Marina Beach, known for its mess-hotels and old Madras character.",
  tags: ["historic", "cultural", "traditional", "beach"],
  storytelling_notes: "Roots-and-legacy stories, the texture of old Madras beneath new ambition.",
  time_context: { dawn: "Filter coffee at Triplicane mess-hotels, temple bells.", evening: "Walk to Marina Beach a few minutes away." },
  micro_locations: [ { name: "Parthasarathy Temple", note: "Historic Vaishnavite temple." } ] },

{ name: "Purasaiwalkam", area_type: "neighborhood", lat: 13.0850, lng: 80.2520,
  description: "Old, dense central neighborhood with a strong local market culture and mixed-income residential character.",
  tags: ["historic", "residential", "commercial"],
  storytelling_notes: "Unglamorous-grind stories, the neighborhood nobody writes startup blog posts about but where real hustle happens.",
  time_context: { evening: "Local market street bustle." },
  micro_locations: [] },

{ name: "Kilpauk", area_type: "neighborhood", lat: 13.0775, lng: 80.2398,
  description: "Established residential neighborhood with a Chennai Metro station, medical college, and a quieter, leafier character than nearby Egmore.",
  tags: ["residential", "transit", "medical"],
  storytelling_notes: "Steady, dependable energy — good for a slide about reliable partnerships.",
  time_context: { morning: "Hospital and college traffic." },
  micro_locations: [] },

{ name: "Anna Salai corridor", area_type: "neighborhood", lat: 13.0601, lng: 80.2615,
  description: "Chennai's historic main commercial artery (formerly Mount Road), lined with corporate offices, showrooms, and landmark buildings like Spencer Plaza.",
  tags: ["commercial", "business", "historic"],
  storytelling_notes: "The spine of Chennai's business history — old banks and new startups share the same road.",
  time_context: { morning: "Corporate office traffic.", evening: "Showroom lights, Spencer Plaza crowds." },
  micro_locations: [ { name: "Spencer Plaza", note: "One of India's oldest shopping malls." } ] },

// ───────────────────────── LANDMARKS, TEMPLES & MONUMENTS ─────────────────────────
{ name: "Marina Beach", area_type: "landmark", lat: 13.0524, lng: 80.2827,
  description: "The world's second longest urban beach. At dawn, it belongs to joggers and fishermen. At dusk, families and couples. The Bay of Bengal stretches infinitely.",
  tags: ["beach", "iconic", "dawn", "perspective"],
  storytelling_notes: "Unbeatable for clarity scenes. Standing at the ocean's edge, thinking about scale. The horizon as metaphor for vision.",
  time_context: { dawn: "Fishermen hauling in nets, joggers, the lighthouse silhouette against pink sky.", morning: "Vendors setting up, school groups on field trips.", afternoon: "Mostly empty, too hot for casual visitors.", evening: "Massive crowds, kite-flyers, bhel-puri carts, horse rides.", night: "Couples and groups lingering, police patrol whistles, surf sound dominant." },
  micro_locations: [ { name: "Marina Lighthouse", note: "Iconic red-and-white striped lighthouse landmark." }, { name: "MGR and Kamarajar memorials", note: "Statue/memorial plazas along the beach road." }, { name: "Foreshore Estate stretch", note: "Quieter, less crowded section." } ] },

{ name: "Kapaleeshwarar Temple", area_type: "cultural", lat: 13.0339, lng: 80.2690,
  description: "Ancient Dravidian temple in Mylapore. The gopuram rises dramatically with intricate tiered sculpture. Pilgrims and tourists. The smell of jasmine and incense. Timelessness.",
  tags: ["spiritual", "ancient", "peace", "cultural"],
  storytelling_notes: "For moments of surrender, seeking wisdom, or pausing to remember what truly matters beyond the startup.",
  time_context: { dawn: "First prayers, temple bells, flower-sellers arriving.", evening: "Crowded, lit gopuram, devotees circling the tank." },
  micro_locations: [ { name: "Temple tank (Kapaleeshwarar tank)", note: "Sacred water tank, photographed gopuram reflection." } ] },

{ name: "Elliot's Beach", area_type: "landmark", lat: 12.9994, lng: 80.2699,
  description: "Calmer and quieter than Marina, in Besant Nagar. Sunset walks, the Karl Schmidt Memorial (locally called the 'Ship' or Vivekananda statue point). Less crowded, more reflective.",
  tags: ["beach", "peaceful", "romantic", "sunset"],
  storytelling_notes: "Intimate conversations, romantic scenes, difficult but important personal decisions.",
  time_context: { dawn: "Yoga groups, a few walkers.", evening: "Couples, families, sunset photography, street food carts." },
  micro_locations: [ { name: "Karl Schmidt Memorial", note: "Ship-shaped memorial structure, iconic photo spot." } ] },

{ name: "Theosophical Society, Adyar", area_type: "cultural", lat: 13.0021, lng: 80.2630,
  description: "270-acre campus of ancient banyan trees, library, and gardens along the Adyar river. One of Chennai's most tranquil spots. Wisdom and peace.",
  tags: ["peace", "wisdom", "nature", "library"],
  storytelling_notes: "Meeting a mentor under ancient trees. Discovering a book that changes everything. Quiet clarity after a storm.",
  time_context: { morning: "Birdsong, very few visitors, deep shade.", evening: "Gates close before sunset — best visited mid-day for quiet." },
  micro_locations: [ { name: "The Great Banyan Tree", note: "One of the largest banyan trees in Asia." }, { name: "Adyar Library", note: "Historic research library on comparative religion." } ] },

{ name: "Valluvar Kottam", area_type: "cultural", lat: 13.0575, lng: 80.2279,
  description: "Monument to Tamil poet-philosopher Thiruvalluvar, shaped like a temple chariot. Outdoor stone amphitheater. Cultural events, morning joggers, couples.",
  tags: ["cultural", "outdoor", "romantic", "peaceful"],
  storytelling_notes: "Ancient wisdom meets modern ambition. A moment of reflection on what has enduring value.",
  time_context: { morning: "Joggers circling the monument park.", evening: "Couples and families on the lawns." },
  micro_locations: [ { name: "112-foot chariot monument", note: "Replica of the Thiruvarur temple chariot." } ] },

{ name: "Chennai Central Railway Station", area_type: "transport", lat: 13.0827, lng: 80.2754,
  description: "The historic red-brick colonial railway terminus, Chennai's busiest. Arrivals, departures, reunions, new beginnings. The city's emotional gateway.",
  tags: ["transport", "historic", "transition"],
  storytelling_notes: "Arrivals and departures. New partnerships beginning. The moment of return after a journey that changed everything.",
  time_context: { dawn: "First long-distance trains arriving, porters in red shirts.", night: "Departure boards glowing, families saying goodbye." },
  micro_locations: [ { name: "Central clock tower", note: "Iconic colonial clock tower, instantly recognizable Chennai silhouette." } ] },

{ name: "Anna Nagar Tower", area_type: "landmark", lat: 13.0863, lng: 80.2095,
  description: "A distinctive multi-story tower at the center of Anna Nagar's roundabout park, a recognizable symbol of the neighborhood.",
  tags: ["landmark", "residential", "iconic"],
  storytelling_notes: "A literal landmark for literal milestones — a good visual for 'arriving' at a goal.",
  time_context: { evening: "Park around the tower fills with walkers and families." },
  micro_locations: [] },

{ name: "Rajaji Hall / Anna Square area", area_type: "landmark", lat: 13.0776, lng: 80.2736,
  description: "Open public square and colonial-era hall near Marina Beach. Political history, public art, the feeling of the city breathing.",
  tags: ["public", "open", "historic", "accessible"],
  storytelling_notes: "Public moments, announcements, the feeling of Chennai as a stage for big things.",
  time_context: { evening: "Open lawns, occasional public gatherings." },
  micro_locations: [] },

{ name: "Fort St. George", area_type: "landmark", lat: 13.0797, lng: 80.2873,
  description: "The first English fortress in India (1644), now housing the Tamil Nadu Legislative Assembly and a museum. The literal foundation stone of colonial Madras.",
  tags: ["historic", "government", "cultural"],
  storytelling_notes: "Origin-story scenes — where something first took root and grew into something much larger.",
  time_context: { morning: "Museum visitors, flag flying over the fort.", afternoon: "Quiet government-office calm inside the walls." },
  micro_locations: [ { name: "St. Mary's Church", note: "Oldest Anglican church east of Suez, inside the fort." } ] },

{ name: "Santhome Cathedral Basilica", area_type: "cultural", lat: 13.0336, lng: 80.2779,
  description: "Neo-Gothic basilica on the seafront, built over the tomb of St. Thomas the Apostle. Striking white spires against the Bay of Bengal.",
  tags: ["spiritual", "historic", "beach", "cultural"],
  storytelling_notes: "Quiet faith-and-perseverance scenes, a striking visual backdrop for resolve.",
  time_context: { morning: "Mass-goers, quiet courtyard.", evening: "Seafront breeze, illuminated spires." },
  micro_locations: [] },

{ name: "Parthasarathy Temple", area_type: "cultural", lat: 13.0571, lng: 80.2789,
  description: "7th–8th century Vaishnavite temple in Triplicane, one of the oldest temples in Chennai, dedicated to Lord Krishna as a charioteer.",
  tags: ["spiritual", "ancient", "cultural"],
  storytelling_notes: "Old-money, old-wisdom backdrop for legacy and tradition themes.",
  time_context: { dawn: "Early morning rituals and bell sounds." },
  micro_locations: [] },

{ name: "Vivekananda House", area_type: "cultural", lat: 13.0490, lng: 80.2820,
  description: "Seafront memorial (formerly the Ice House) where Swami Vivekananda stayed in 1897 after returning from the West — now a meditation and exhibition hall.",
  tags: ["spiritual", "historic", "beach"],
  storytelling_notes: "A literal building about a homecoming-with-purpose — strong for breakthrough/return slides.",
  time_context: { morning: "Quiet, meditative visitors." },
  micro_locations: [] },

{ name: "Government Museum, Egmore", area_type: "cultural", lat: 13.0709, lng: 80.2580,
  description: "One of the oldest museums in India (1851), with an important bronze gallery and a striking red Indo-Saracenic building.",
  tags: ["cultural", "historic", "museum"],
  storytelling_notes: "Stories about craftsmanship, the long arc of mastering a discipline.",
  time_context: { afternoon: "School groups, echoing galleries." },
  micro_locations: [] },

{ name: "St. Thomas Mount", area_type: "landmark", lat: 13.0019, lng: 80.1958,
  description: "A small hillock where St. Thomas the Apostle is believed to have been martyred, with a chapel at the summit and panoramic city views, plus a Chennai Metro station at its base.",
  tags: ["spiritual", "historic", "perspective", "transit"],
  storytelling_notes: "Literal high-ground perspective scenes — seeing the whole city, and the whole problem, from above.",
  time_context: { evening: "Sunset views over the airport and southern Chennai." },
  micro_locations: [ { name: "Our Lady of Expectation Chapel", note: "Small chapel at the hill's summit." } ] },

{ name: "Semmozhi Poonga", area_type: "park", lat: 13.0468, lng: 80.2497,
  description: "Chennai's first botanical garden, opened 2010, opposite the Chennai Trade Centre on Cathedral Road, with over 500 plant species across themed zones.",
  tags: ["nature", "peaceful", "green"],
  storytelling_notes: "A manicured, deliberate garden — good for scenes about careful planning paying off.",
  time_context: { morning: "Quiet, well-tended paths, birdsong." },
  micro_locations: [] },

{ name: "Guindy National Park", area_type: "park", lat: 13.0067, lng: 80.2206,
  description: "One of the smallest national parks in India, located within city limits, with deer, blackbuck, and dense scrub forest right beside Raj Bhavan and IIT Madras.",
  tags: ["nature", "wildlife", "peaceful"],
  storytelling_notes: "Nature persisting inside the city — a metaphor for protecting what matters amid growth.",
  time_context: { morning: "Best wildlife sightings, cool air." },
  micro_locations: [ { name: "Children's Park & Snake Park (adjacent)", note: "Family-oriented sections near the main park." } ] },

{ name: "Tholkappia Poonga (Adyar Eco Park)", area_type: "park", lat: 13.0090, lng: 80.2630,
  description: "Ecological restoration park in the Adyar estuary, with boardwalks through mangrove and wetland habitat, home to over 160 tree species.",
  tags: ["nature", "peaceful", "green"],
  storytelling_notes: "Restoration and renewal themes — land brought back to life, mirroring a business turnaround.",
  time_context: { evening: "Quiet boardwalks, birds returning to roost." },
  micro_locations: [] },

{ name: "Panagal Park", area_type: "park", lat: 13.0410, lng: 80.2350,
  description: "Small central park at the heart of T. Nagar's shopping district, a rare patch of green amid the commercial chaos.",
  tags: ["green", "commercial", "bustling"],
  storytelling_notes: "An oasis-in-the-middle-of-the-grind visual.",
  time_context: { evening: "Office workers cutting through on their way home." },
  micro_locations: [] },

{ name: "Nageswara Rao Park", area_type: "park", lat: 13.0345, lng: 80.2660,
  description: "Mylapore's neighborhood park, popular for morning walks and evening gatherings near the temple tank.",
  tags: ["green", "peaceful", "residential"],
  storytelling_notes: "Everyday-ritual scenes — the small park where a founder thinks out loud every morning.",
  time_context: { dawn: "Regular morning-walk groups." },
  micro_locations: [] },

{ name: "Elliot's Beach Promenade", area_type: "park", lat: 12.9985, lng: 80.2705,
  description: "The paved walking promenade running alongside Elliot's Beach, popular for evening exercise and food carts.",
  tags: ["beach", "green", "relaxed"],
  storytelling_notes: "Walk-and-talk scenes, pacing through a hard decision.",
  time_context: { evening: "Steady stream of walkers and joggers." },
  micro_locations: [] },

{ name: "Anna Nagar Tower Park", area_type: "park", lat: 13.0863, lng: 80.2095,
  description: "Roundabout park surrounding the Anna Nagar Tower, with a boating lake and musical fountain.",
  tags: ["green", "residential", "family"],
  storytelling_notes: "Family-and-founder-life-balance scenes.",
  time_context: { evening: "Musical fountain shows draw crowds." },
  micro_locations: [] },

{ name: "Madras Boat Club / Adyar riverfront", area_type: "park", lat: 13.0205, lng: 80.2538,
  description: "Historic rowing club along the Adyar river, with a calm riverside stretch popular for evening walks.",
  tags: ["green", "peaceful", "historic"],
  storytelling_notes: "Old-institution-meets-new-ambition scenes.",
  time_context: { evening: "Rowers on the water, walkers on the bank." },
  micro_locations: [] },

// ───────────────────────── MARKETS & SHOPPING STREETS ─────────────────────────
{ name: "Burma Bazaar", area_type: "market", lat: 13.0958, lng: 80.2901,
  description: "Established in 1969 by Myanmar-immigrant traders near the harbour, a dense lane of stalls selling imported electronics, perfumes, and clothing at bargain prices.",
  tags: ["market", "bustling", "bargain", "historic"],
  storytelling_notes: "Hustle-economy stories, the original Chennai 'side business' culture.",
  time_context: { afternoon: "Packed narrow lanes, constant bargaining chatter." },
  micro_locations: [] },

{ name: "Koyambedu Wholesale Market", area_type: "market", lat: 13.0702, lng: 80.1958,
  description: "One of Asia's largest wholesale markets for vegetables, fruit, and flowers, with over 3,000 shops, operating through the night into early morning.",
  tags: ["market", "bustling", "wholesale"],
  storytelling_notes: "Supply-chain and scale stories — the unglamorous backend that makes everything else possible.",
  time_context: { dawn: "Peak trading hours, trucks unloading, flower-market color and noise.", night: "Trading begins, building toward dawn peak." },
  micro_locations: [ { name: "Flower market section", note: "Most photogenic and fragrant part of the complex." } ] },

{ name: "Moore Market / Chennai Central Bazaar area", area_type: "market", lat: 13.0815, lng: 80.2766,
  description: "Historic market area near Chennai Central, once famous for its colonial-era market hall (since rebuilt), now a dense commercial lane.",
  tags: ["market", "historic", "commercial"],
  storytelling_notes: "Old-Madras commerce, things that have survived reinvention.",
  time_context: { afternoon: "Shop-to-shop foot traffic." },
  micro_locations: [] },

{ name: "Pondy Bazaar (Ranganathan Street)", area_type: "market", lat: 13.0410, lng: 80.2340,
  description: "T. Nagar's pedestrian shopping street, one of the most crowded retail stretches in South India, especially during festival season.",
  tags: ["market", "bustling", "shopping"],
  storytelling_notes: "Peak-season-pressure stories — everyone moving at once, decisions made fast.",
  time_context: { evening: "Wall-to-wall foot traffic, vendors calling out prices." },
  micro_locations: [] },

{ name: "Usman Road", area_type: "street", lat: 13.0432, lng: 80.2330,
  description: "T. Nagar's saree and jewelry shopping spine, lined with multi-story textile showrooms.",
  tags: ["market", "shopping", "commercial"],
  storytelling_notes: "Generational-business stories — textile shops passed down through families.",
  time_context: { evening: "Showroom lights, wedding-shopping crowds." },
  micro_locations: [] },

{ name: "Sannathi Street, Mylapore", area_type: "street", lat: 13.0345, lng: 80.2685,
  description: "The temple-flanking street leading to Kapaleeshwarar Temple, lined with flower stalls, kolam-powder vendors, and traditional goods shops.",
  tags: ["market", "spiritual", "traditional"],
  storytelling_notes: "Ritual-and-routine scenes — the comfort of a path walked many times before.",
  time_context: { dawn: "Flower vendors arriving before temple opens." },
  micro_locations: [] },

{ name: "George Town (Sowcarpet & Mint Street)", area_type: "market", lat: 13.0935, lng: 80.2843,
  description: "Chennai's original old town and historic trading district — Mint Street and Sowcarpet remain dense wholesale hubs for textiles, stationery, and spices.",
  tags: ["market", "historic", "bustling", "wholesale"],
  storytelling_notes: "Origin-of-Chennai-commerce stories — where the city's first trading networks formed.",
  time_context: { afternoon: "Narrow lanes packed with handcarts and wholesale buyers." },
  micro_locations: [ { name: "Mint Street", note: "Historic wholesale trading lane." } ] },

{ name: "Khader Nawaz Khan Road", area_type: "street", lat: 13.0612, lng: 80.2478,
  description: "Upscale Nungambakkam shopping street, once a quiet residential lane, now lined with designer boutiques, galleries, and cafes ('KNK Road').",
  tags: ["shopping", "creative", "premium", "cafes"],
  storytelling_notes: "Reinvention stories — a quiet street that became something else entirely, like a pivoted business.",
  time_context: { evening: "Boutique lights, valet-parked cars, café crowds." },
  micro_locations: [] },

{ name: "Cathedral Road", area_type: "street", lat: 13.0500, lng: 80.2510,
  description: "Wide central avenue connecting Nungambakkam to Teynampet, home to the Chennai Trade Centre, churches, and corporate offices.",
  tags: ["commercial", "historic"],
  storytelling_notes: "Connector-road stories — the path between two different worlds of a founder's life.",
  time_context: { morning: "Steady office-bound traffic." },
  micro_locations: [] },

{ name: "Radhakrishnan Salai", area_type: "street", lat: 13.0590, lng: 80.2680,
  description: "Tree-lined road past the University of Madras and the Marina, popular for its colonial-era buildings and seafront proximity.",
  tags: ["historic", "academic", "beach"],
  storytelling_notes: "Scholarly-ambition scenes, walking and thinking near the sea.",
  time_context: { evening: "Students and walkers heading toward the Marina." },
  micro_locations: [] },

// ───────────────────────── IT CORRIDORS ─────────────────────────
{ name: "Tidel Park", area_type: "business", lat: 12.9851, lng: 80.2459,
  description: "Iconic Y2K-era IT tower on OMR, once Asia's largest IT park. Thousands of engineers. The place where many Chennai tech careers began.",
  tags: ["it", "tech", "corporate", "career"],
  storytelling_notes: "The moment of leaving a safe corporate job to start something. Or returning changed after a startup failure.",
  time_context: { morning: "Shuttle buses unloading hundreds of employees.", evening: "Mass exodus, food stalls outside the gate." },
  micro_locations: [] },

{ name: "DLF IT Park / Manapakkam corridor", area_type: "business", lat: 13.0024, lng: 80.1875,
  description: "Major IT campus cluster near Porur, anchoring the western stretch of Chennai's tech corridor.",
  tags: ["it", "tech", "corporate"],
  storytelling_notes: "Scale stories — large campuses, large ambitions.",
  time_context: { morning: "Campus-bound shuttle traffic." },
  micro_locations: [] },

{ name: "Ambattur Industrial Estate", area_type: "business", lat: 13.1143, lng: 80.1548,
  description: "One of Asia's largest industrial estates, historically Chennai's manufacturing backbone — leather, auto components, engineering goods.",
  tags: ["industrial", "manufacturing", "established"],
  storytelling_notes: "Hands-on-manufacturing stories — the physical, unglamorous side of building something real.",
  time_context: { morning: "Factory shift-change traffic." },
  micro_locations: [] },

{ name: "GST Road IT/industrial corridor", area_type: "business", lat: 12.9675, lng: 80.1325,
  description: "Highway corridor toward the airport lined with logistics parks, manufacturing units, and emerging IT campuses.",
  tags: ["it", "industrial", "growth"],
  storytelling_notes: "Logistics-and-scale stories, the corridor that connects Chennai to the rest of the world via the airport.",
  time_context: { morning: "Cargo trucks and commuter traffic mixing." },
  micro_locations: [] },

{ name: "Olympia Tech Park, Guindy", area_type: "business", lat: 13.0103, lng: 80.2126,
  description: "Large modern IT campus near Guindy, home to global tech and consulting firms, with sleek glass-tower architecture.",
  tags: ["it", "tech", "corporate", "premium"],
  storytelling_notes: "Polished-ambition stories — the gleaming campus a founder dreams of growing into.",
  time_context: { evening: "Lit-up glass towers visible from the Guindy flyover." },
  micro_locations: [] },

{ name: "RMZ Millenia / Perungudi IT belt", area_type: "business", lat: 12.9605, lng: 80.2390,
  description: "Cluster of large IT campuses along OMR's Perungudi stretch, housing major tech and BPO employers.",
  tags: ["it", "tech", "corporate"],
  storytelling_notes: "Mid-stage-scaling stories — not a startup anymore, not yet a giant.",
  time_context: { morning: "Heavy two-wheeler and cab traffic converging." },
  micro_locations: [] },

// ───────────────────────── STARTUP HUBS, COLLEGES & INCUBATORS ─────────────────────────
{ name: "IIT Madras Research Park", area_type: "business", lat: 12.9916, lng: 80.2336,
  description: "India's premier university-linked research park in Taramani, home to the IIT Madras Incubation Cell — one of India's leading deep-tech startup hubs with hundreds of incubated ventures.",
  tags: ["startup", "incubator", "tech", "serious", "deeptech"],
  storytelling_notes: "First investor meeting. The whiteboard session that changed everything. Meeting a technical co-founder.",
  time_context: { morning: "Researchers and founders arriving, security checking badges.", evening: "Late-working deep-tech teams, lab lights still on." },
  micro_locations: [ { name: "IITM Incubation Cell office", note: "Where many of Chennai's deep-tech startups began." } ] },

{ name: "Anna University", area_type: "education", lat: 13.0107, lng: 80.2350,
  description: "Chennai's flagship technical university in Guindy, alma mater to generations of engineers, with its own startup and innovation cells.",
  tags: ["education", "startup", "tech"],
  storytelling_notes: "Origin-story scenes — the campus where a founding idea was first sketched on a notebook page.",
  time_context: { morning: "Students streaming between lecture halls.", evening: "Campus quiets, hostel lights coming on." },
  micro_locations: [] },

{ name: "SRM Institute of Science and Technology", area_type: "education", lat: 12.8230, lng: 80.0440,
  description: "Major private university in Kattankulathur, south of Chennai, known for its engineering and entrepreneurship programs.",
  tags: ["education", "startup"],
  storytelling_notes: "Big-campus-energy stories — ambition formed in scale and competition.",
  time_context: {},
  micro_locations: [] },

{ name: "VIT Chennai", area_type: "education", lat: 12.8406, lng: 80.1534,
  description: "Chennai campus of VIT, in Vandalur, known for its technology and design programs and a young, energetic student culture.",
  tags: ["education", "startup", "creative"],
  storytelling_notes: "Cross-disciplinary-spark stories — where design and engineering students collide.",
  time_context: {},
  micro_locations: [] },

{ name: "Loyola College", area_type: "education", lat: 13.0512, lng: 80.2585,
  description: "Historic Jesuit liberal arts and commerce college in Nungambakkam, known for producing generations of Chennai's business and civic leaders.",
  tags: ["education", "historic", "business"],
  storytelling_notes: "Values-and-leadership formation stories.",
  time_context: {},
  micro_locations: [] },

{ name: "Madras Christian College", area_type: "education", lat: 12.9170, lng: 80.1240,
  description: "One of Asia's oldest colleges (founded 1837), set on a leafy 365-acre campus in Tambaram, known for its academic rigor and tree-lined quiet.",
  tags: ["education", "historic", "peaceful"],
  storytelling_notes: "Deep-roots-deep-thinking scenes — old institutions producing patient, long-term thinkers.",
  time_context: { afternoon: "Quiet, shaded walking paths between century-old trees." },
  micro_locations: [] },

{ name: "Indian Institute of Technology Madras (main campus)", area_type: "education", lat: 12.9915, lng: 80.2336,
  description: "India's top-ranked engineering institute, set inside a forested campus that overlaps with Guindy National Park, home to deer and blackbuck alongside research labs.",
  tags: ["education", "startup", "tech", "nature"],
  storytelling_notes: "Discipline-and-wildness-coexisting visual — rigorous research inside an actual forest.",
  time_context: { dawn: "Deer crossing campus roads before traffic begins.", evening: "Research scholars cycling between labs and hostels." },
  micro_locations: [] },

{ name: "Saveetha Institute / Sholinganallur education belt", area_type: "education", lat: 12.8965, lng: 80.2270,
  description: "Cluster of engineering and medical colleges along the OMR corridor near Sholinganallur, feeding talent directly into the adjacent IT parks.",
  tags: ["education", "it"],
  storytelling_notes: "Pipeline stories — the direct line from classroom to cubicle to founder's desk.",
  time_context: {},
  micro_locations: [] },

{ name: "Tidel Park Coimbatore-style coworking belt (Perungudi)", area_type: "business", lat: 12.9706, lng: 80.2425,
  description: "Cluster of coworking spaces and small startup offices that grew up around the OMR IT corridor's southern stretch.",
  tags: ["startup", "coworking", "it"],
  storytelling_notes: "Bootstrap-era stories — shared desks, shared ambition.",
  time_context: {},
  micro_locations: [] },

{ name: "Madras Management Association", area_type: "business", lat: 13.0467, lng: 80.2425,
  description: "Long-running professional and management association in Chennai hosting talks, mentorship circles, and networking events for business leaders.",
  tags: ["business", "mentorship", "professional"],
  storytelling_notes: "Mentor-meeting scenes, formal advice-seeking moments.",
  time_context: {},
  micro_locations: [] },

{ name: "Chennai Angels / startup networking circuit (Nungambakkam)", area_type: "business", lat: 13.0570, lng: 80.2440,
  description: "Informal cluster of angel-investor and founder meetups concentrated in Nungambakkam's cafes and private offices.",
  tags: ["startup", "investor", "networking"],
  storytelling_notes: "Pitch-meeting and funding-decision scenes.",
  time_context: {},
  micro_locations: [] },

{ name: "Asian College of Journalism", area_type: "education", lat: 12.9970, lng: 80.2580,
  description: "Premier journalism and media school in Adyar, producing many of South India's working journalists and media entrepreneurs.",
  tags: ["education", "creative"],
  storytelling_notes: "Storytelling-as-a-craft scenes — fitting for narrative/communications business challenges.",
  time_context: {},
  micro_locations: [] },

// ───────────────────────── HOSPITALS ─────────────────────────
{ name: "Apollo Hospitals, Greams Road", area_type: "hospital", lat: 13.0613, lng: 80.2497,
  description: "Flagship hospital of India's largest private healthcare chain, founded in Chennai in 1983, a globally recognized medical landmark.",
  tags: ["medical", "established", "premium"],
  storytelling_notes: "Health-scare-as-wake-up-call scenes for founders neglecting themselves while building.",
  time_context: {},
  micro_locations: [] },

{ name: "Sankara Nethralaya", area_type: "hospital", lat: 13.0398, lng: 80.2461,
  description: "World-renowned eye hospital and research institute in Chennai, known for its charitable mission alongside cutting-edge ophthalmology.",
  tags: ["medical", "mission-driven"],
  storytelling_notes: "Mission-over-margin stories — institutions built to serve first, profit second.",
  time_context: {},
  micro_locations: [] },

{ name: "Government General Hospital (Rajiv Gandhi GH)", area_type: "hospital", lat: 13.0857, lng: 80.2766,
  description: "One of India's oldest and largest public hospitals, near Chennai Central, serving enormous patient volumes daily.",
  tags: ["medical", "public", "historic"],
  storytelling_notes: "Scale-and-access stories — serving everyone, not just the premium segment.",
  time_context: {},
  micro_locations: [] },

{ name: "Sri Ramachandra Medical Centre", area_type: "hospital", lat: 13.0440, lng: 80.1490,
  description: "Major private medical college and hospital in Porur, part of a large health sciences university campus.",
  tags: ["medical", "education"],
  storytelling_notes: "Long-training, long-payoff stories — the deferred-gratification arc of medicine mirrored in deep-tech startups.",
  time_context: {},
  micro_locations: [] },

{ name: "Kilpauk Medical College Hospital", area_type: "hospital", lat: 13.0790, lng: 80.2390,
  description: "Historic government medical college and hospital in Kilpauk, training generations of Tamil Nadu's doctors.",
  tags: ["medical", "education", "public"],
  storytelling_notes: "Public-service-foundation stories.",
  time_context: {},
  micro_locations: [] },

{ name: "MIOT International", area_type: "hospital", lat: 13.0148, lng: 80.1640,
  description: "Large multi-specialty hospital in Manapakkam, known for orthopedics and cardiac care, serving the western IT corridor population.",
  tags: ["medical", "premium"],
  storytelling_notes: "Recovery-and-resilience scenes.",
  time_context: {},
  micro_locations: [] },

// ───────────────────────── CAFES & RESTAURANTS BY AREA ─────────────────────────
{ name: "Amethyst Café, Nungambakkam", area_type: "food", lat: 13.0518, lng: 80.2515,
  description: "Chennai's most beloved independent café, set in a converted colonial bungalow. Shaded courtyard, excellent coffee, mix of artists, consultants, and entrepreneurs.",
  tags: ["cafe", "creative", "meetings", "entrepreneurial"],
  storytelling_notes: "The ideal setting for a pivotal conversation. A co-founder discovery. A mentor sharing wisdom over filter coffee.",
  time_context: { morning: "Quiet, a few laptop workers in the courtyard.", evening: "Full courtyard, soft string lights, low conversation hum." },
  micro_locations: [ { name: "Courtyard garden seating", note: "Signature outdoor seating under old trees." } ] },

{ name: "Chamiers Café, Adyar", area_type: "food", lat: 13.0035, lng: 80.2533,
  description: "Boutique café in Adyar, beloved for its books-and-coffee atmosphere. Quiet tables, good food, thoughtful clientele.",
  tags: ["cafe", "books", "quiet", "adyar"],
  storytelling_notes: "Reading a chapter that changes everything. Journaling after a breakthrough insight.",
  time_context: { afternoon: "Readers and solo laptop workers, quiet background music." },
  micro_locations: [] },

{ name: "Karpagambal Mess, Mylapore", area_type: "food", lat: 13.0352, lng: 80.2693,
  description: "Iconic no-frills Mylapore breakfast institution, serving filter coffee and tiffin to generations of locals on steel plates at communal tables.",
  tags: ["food", "traditional", "bustling", "affordable"],
  storytelling_notes: "Roots-and-humility scenes — where success doesn't mean forgetting where you started.",
  time_context: { dawn: "Packed with regulars before work, steam off filter coffee tumblers." },
  micro_locations: [] },

{ name: "Murugan Idli Shop", area_type: "food", lat: 13.0445, lng: 80.2336,
  description: "Beloved Chennai-origin idli chain (multiple branches across the city) known for its soft idlis and chutneys — a comfort-food institution.",
  tags: ["food", "traditional", "comfort"],
  storytelling_notes: "Comfort-food-after-a-hard-day scenes.",
  time_context: {},
  micro_locations: [] },

{ name: "Sandy's Chocolate Laboratory, Sterling Road", area_type: "food", lat: 13.0670, lng: 80.2390,
  description: "Quirky, design-forward café and chocolate workshop popular with Chennai's creative and startup crowd.",
  tags: ["cafe", "creative", "design"],
  storytelling_notes: "Playful-pivot scenes — businesses that found joy in reinvention.",
  time_context: {},
  micro_locations: [] },

{ name: "Broken Bridge, Besant Nagar", area_type: "food", lat: 12.9920, lng: 80.2745,
  description: "Atmospheric stretch of broken bridge over the Adyar estuary near Besant Nagar, a popular spot for quiet conversation and the sound of water.",
  tags: ["peaceful", "romantic", "beach"],
  storytelling_notes: "Liminal-space scenes — neither here nor there, good for indecision-to-clarity moments.",
  time_context: { evening: "Couples and small groups sitting on the broken span." },
  micro_locations: [] },

{ name: "Cream Centre, Anna Salai", area_type: "food", lat: 13.0590, lng: 80.2610,
  description: "Long-running vegetarian restaurant chain with a Chennai institution status, popular for family celebrations and casual business lunches.",
  tags: ["food", "established", "family"],
  storytelling_notes: "Family-business-meeting scenes.",
  time_context: {},
  micro_locations: [] },

{ name: "Ratna Café, T. Nagar", area_type: "food", lat: 13.0405, lng: 80.2330,
  description: "Legendary T. Nagar tiffin restaurant, always crowded, known for its rava kesari and efficient, no-nonsense service.",
  tags: ["food", "traditional", "bustling"],
  storytelling_notes: "Efficiency-under-pressure scenes — getting it right even when overwhelmed with demand.",
  time_context: { morning: "Long breakfast queues out the door." },
  micro_locations: [] },

{ name: "Mathsya, Besant Nagar", area_type: "food", lat: 12.9985, lng: 80.2695,
  description: "Popular seafood and South Indian restaurant near Elliot's Beach, a favorite for celebratory dinners.",
  tags: ["food", "beach", "celebratory"],
  storytelling_notes: "Celebration-of-a-milestone scenes.",
  time_context: {},
  micro_locations: [] },

{ name: "Annalakshmi Restaurant", area_type: "food", lat: 13.0625, lng: 80.2640,
  description: "Pay-what-you-feel vegetarian restaurant run by volunteers, with elaborate traditional thalis and a philanthropic philosophy.",
  tags: ["food", "mission-driven", "traditional"],
  storytelling_notes: "Generosity-as-business-model scenes.",
  time_context: {},
  micro_locations: [] },

{ name: "Cafe Coffee Day, OMR strip", area_type: "food", lat: 12.9300, lng: 80.2270,
  description: "One of many chain cafes dotting the OMR IT corridor, functioning as informal meeting points for tech workers and founders between office hours.",
  tags: ["cafe", "it", "meetings"],
  storytelling_notes: "Quick-decision, between-meetings scenes.",
  time_context: {},
  micro_locations: [] },

{ name: "Writer's Cafe, Egmore", area_type: "food", lat: 13.0760, lng: 80.2600,
  description: "Quiet, book-lined café near Egmore popular with writers, students, and small reading groups.",
  tags: ["cafe", "quiet", "creative"],
  storytelling_notes: "Solo-reflection-and-writing scenes.",
  time_context: {},
  micro_locations: [] },

{ name: "The Flying Squirrel, Adyar", area_type: "food", lat: 13.0050, lng: 80.2570,
  description: "Specialty coffee roastery and café in Adyar, popular with Chennai's design and tech crowd for its quiet work-friendly atmosphere.",
  tags: ["cafe", "creative", "it-crowd"],
  storytelling_notes: "Craft-and-care scenes — businesses built on getting the small details right.",
  time_context: {},
  micro_locations: [] },

{ name: "Tuscana Pizzeria, Khader Nawaz Khan Road", area_type: "food", lat: 13.0610, lng: 80.2475,
  description: "Popular casual-fine-dining spot on KNK Road, a favorite for celebratory or investor dinners.",
  tags: ["food", "premium", "meetings"],
  storytelling_notes: "Investor-dinner and deal-closing scenes.",
  time_context: {},
  micro_locations: [] },

{ name: "Sangeetha Veg Restaurant chain", area_type: "food", lat: 13.0450, lng: 80.2310,
  description: "Reliable, ubiquitous Chennai vegetarian restaurant chain — the dependable default for quick, honest meals across the city.",
  tags: ["food", "reliable", "everyday"],
  storytelling_notes: "Everyday-reliability scenes — the unglamorous consistency that keeps a business running.",
  time_context: {},
  micro_locations: [] },

{ name: "Adyar Ananda Bhavan (A2B)", area_type: "food", lat: 13.0040, lng: 80.2550,
  description: "Chennai-born sweets and vegetarian restaurant chain that grew from a single Adyar shop into a national brand — a genuine homegrown scale story.",
  tags: ["food", "scale", "homegrown", "established"],
  storytelling_notes: "The single best real-world 'started local, scaled national' Chennai business story for a slide.",
  time_context: {},
  micro_locations: [] },

// ───────────────────────── EAST COAST ROAD / SCENIC DRIVES ─────────────────────────
{ name: "ECR (East Coast Road)", area_type: "transport", lat: 12.8820, lng: 80.2410,
  description: "The scenic coastal highway south of Chennai toward Mahabalipuram. Dawn drives, weekend escapes, roadside food stalls. The road where Chennai breathes freely.",
  tags: ["road", "scenic", "freedom", "drive"],
  storytelling_notes: "The long drive where a decision crystallizes. Team road trips. The startup retreat that saves the company.",
  time_context: { dawn: "Empty road, fishing villages stirring, sea mist.", evening: "Sunset drives, roadside grilled-corn vendors." },
  micro_locations: [ { name: "Kovalam village stretch", note: "First fishing-village landmark on the drive out of the city." } ] },

{ name: "Muttukadu Boat House", area_type: "landmark", lat: 12.8125, lng: 80.2470,
  description: "Backwater boating spot on ECR, popular for windsurfing and a calm break partway to Mahabalipuram.",
  tags: ["scenic", "relaxed", "drive"],
  storytelling_notes: "Mid-journey-pause scenes — the rest stop where clarity arrives.",
  time_context: {},
  micro_locations: [] },

{ name: "Mahabalipuram (Mamallapuram) Shore Temple", area_type: "landmark", lat: 12.6269, lng: 80.1927,
  description: "UNESCO World Heritage 7th-century shore temple and rock-cut monument complex, an hour south of Chennai on ECR — ancient maritime trade history made visible in stone.",
  tags: ["historic", "ancient", "beach", "cultural"],
  storytelling_notes: "Legacy-built-to-last scenes — structures and businesses meant to outlive their founders.",
  time_context: { dawn: "Empty monuments, golden light on ancient stone." },
  micro_locations: [] },

// ───────────────────────── CHENNAI METRO — BLUE LINE ─────────────────────────
{ name: "Chennai Airport Metro Station", area_type: "transport", lat: 12.9820, lng: 80.1693,
  description: "Southern terminus of the Blue Line, directly connected to Chennai International Airport — the city's literal gateway to the world.",
  tags: ["transport", "transit", "airport"],
  storytelling_notes: "Arrival-of-an-opportunity scenes — the investor flying in, the founder flying out to raise funds.",
  time_context: {}, micro_locations: [] },

{ name: "Meenambakkam Metro Station", area_type: "transport", lat: 12.9904, lng: 80.1715,
  description: "Elevated Blue Line station near the airport, interchange with suburban rail.",
  tags: ["transport", "transit"], storytelling_notes: "Transit-point scenes.", time_context: {}, micro_locations: [] },

{ name: "Nanganallur Road Metro Station", area_type: "transport", lat: 12.9963, lng: 80.1815,
  description: "Elevated Blue Line station serving the Nanganallur residential belt.",
  tags: ["transport", "transit", "residential"], storytelling_notes: "Commuter-routine scenes.", time_context: {}, micro_locations: [] },

{ name: "Alandur Metro Station", area_type: "transport", lat: 13.0034, lng: 80.2009,
  description: "Major interchange station between the Blue Line and Green Line, one of the busiest junctions in the network.",
  tags: ["transport", "transit", "interchange"],
  storytelling_notes: "Crossroads-decision scenes — literally where two lines, and two paths, meet.",
  time_context: {}, micro_locations: [] },

{ name: "Guindy Metro Station", area_type: "transport", lat: 13.0078, lng: 80.2154,
  description: "Elevated Blue Line station beside Guindy National Park and Guindy Race Course, interchange with suburban rail.",
  tags: ["transport", "transit", "nature"], storytelling_notes: "Nature-meets-infrastructure scenes.", time_context: {}, micro_locations: [] },

{ name: "Little Mount Metro Station", area_type: "transport", lat: 13.0148, lng: 80.2227,
  description: "Elevated Blue Line station near the historic St. Thomas Mount area, one of the first stations opened on the network in 2016.",
  tags: ["transport", "transit", "historic"], storytelling_notes: "First-step scenes — where the metro itself began.", time_context: {}, micro_locations: [] },

{ name: "Saidapet Metro Station", area_type: "transport", lat: 13.0210, lng: 80.2240,
  description: "Underground Blue Line station near the Adyar river and Saidapet court complex.",
  tags: ["transport", "transit"], storytelling_notes: "Bureaucracy-and-patience scenes.", time_context: {}, micro_locations: [] },

{ name: "Nandanam Metro Station", area_type: "transport", lat: 13.0340, lng: 80.2380,
  description: "Underground Blue Line station serving the Nandanam residential and college area.",
  tags: ["transport", "transit", "education"], storytelling_notes: "Student-to-professional transition scenes.", time_context: {}, micro_locations: [] },

{ name: "Teynampet Metro Station", area_type: "transport", lat: 13.0440, lng: 80.2470,
  description: "Underground Blue Line station at a major commercial junction connecting Anna Salai to Nungambakkam.",
  tags: ["transport", "transit", "commercial"], storytelling_notes: "Connector-junction scenes.", time_context: {}, micro_locations: [] },

{ name: "AG-DMS Metro Station", area_type: "transport", lat: 13.0510, lng: 80.2480,
  description: "Underground Blue Line station near the Directorate of Medical Services, central Chennai.",
  tags: ["transport", "transit"], storytelling_notes: "Mid-journey scenes.", time_context: {}, micro_locations: [] },

{ name: "Thousand Lights Metro Station", area_type: "transport", lat: 13.0570, lng: 80.2570,
  description: "Underground Blue Line station beside the historic Thousand Lights Mosque, on Anna Salai.",
  tags: ["transport", "transit", "historic"], storytelling_notes: "Illumination/clarity-themed scenes (literal name fit).", time_context: {}, micro_locations: [] },

{ name: "LIC Metro Station", area_type: "transport", lat: 13.0610, lng: 80.2610,
  description: "Underground Blue Line station beside the landmark LIC office tower on Anna Salai.",
  tags: ["transport", "transit", "business"], storytelling_notes: "Insurance-against-risk metaphor scenes.", time_context: {}, micro_locations: [] },

{ name: "Government Estate Metro Station", area_type: "transport", lat: 13.0680, lng: 80.2660,
  description: "Underground Blue Line station near the Tamil Nadu Secretariat and Government Estate complex.",
  tags: ["transport", "transit", "government"], storytelling_notes: "Regulatory-approval scenes.", time_context: {}, micro_locations: [] },

{ name: "Chennai Central Metro Station", area_type: "transport", lat: 13.0822, lng: 80.2750,
  description: "Underground interchange station beneath Chennai Central railway terminus, connecting Blue Line and Green Line.",
  tags: ["transport", "transit", "interchange"], storytelling_notes: "Major-life-transition scenes.", time_context: {}, micro_locations: [] },

{ name: "High Court Metro Station", area_type: "transport", lat: 13.0940, lng: 80.2880,
  description: "Underground Blue Line station beside the Madras High Court complex and Broadway bus terminus.",
  tags: ["transport", "transit", "government"], storytelling_notes: "Legal-resolution scenes.", time_context: {}, micro_locations: [] },

{ name: "Mannadi Metro Station", area_type: "transport", lat: 13.0960, lng: 80.2870,
  description: "Underground Blue Line station in the historic George Town trading district.",
  tags: ["transport", "transit", "historic"], storytelling_notes: "Old-trade-district scenes.", time_context: {}, micro_locations: [] },

{ name: "Washermanpet Metro Station", area_type: "transport", lat: 13.1140, lng: 80.2930,
  description: "Underground Blue Line station in the historic dyeing/textile-worker neighborhood of Washermanpet.",
  tags: ["transport", "transit", "historic"], storytelling_notes: "Working-class-roots scenes.", time_context: {}, micro_locations: [] },

{ name: "Tondiarpet Metro Station", area_type: "transport", lat: 13.1280, lng: 80.2940,
  description: "Underground Blue Line station serving the northern port-adjacent Tondiarpet neighborhood.",
  tags: ["transport", "transit"], storytelling_notes: "Industrial-edge-of-city scenes.", time_context: {}, micro_locations: [] },

{ name: "Wimco Nagar Metro Station", area_type: "transport", lat: 13.1690, lng: 80.3050,
  description: "Northern terminus of the Blue Line, near the Wimco Nagar depot.",
  tags: ["transport", "transit"], storytelling_notes: "End-of-the-line scenes — the final stretch of a long journey.", time_context: {}, micro_locations: [] },

// ───────────────────────── CHENNAI METRO — GREEN LINE ─────────────────────────
{ name: "St. Thomas Mount Metro Station", area_type: "transport", lat: 13.0019, lng: 80.1958,
  description: "Southwestern terminus shared by the Green Line, at the base of the historic St. Thomas Mount hill.",
  tags: ["transport", "transit", "historic"], storytelling_notes: "Foundational-history scenes.", time_context: {}, micro_locations: [] },

{ name: "Ekkattuthangal Metro Station", area_type: "transport", lat: 13.0185, lng: 80.2090,
  description: "Elevated Green Line station serving a growing residential and small-business pocket near Guindy.",
  tags: ["transport", "transit", "growing"], storytelling_notes: "Quiet-growth scenes.", time_context: {}, micro_locations: [] },

{ name: "Ashok Nagar Metro Station", area_type: "transport", lat: 13.0381, lng: 80.2126,
  description: "Elevated Green Line station serving the Ashok Nagar residential and commercial belt.",
  tags: ["transport", "transit", "residential"], storytelling_notes: "Steady-progress scenes.", time_context: {}, micro_locations: [] },

{ name: "Vadapalani Metro Station", area_type: "transport", lat: 13.0503, lng: 80.2126,
  description: "Elevated Green Line station beside the Vadapalani Murugan Temple junction.",
  tags: ["transport", "transit", "spiritual"], storytelling_notes: "Crossroads-of-faith-and-commerce scenes.", time_context: {}, micro_locations: [] },

{ name: "Arumbakkam Metro Station", area_type: "transport", lat: 13.0735, lng: 80.2050,
  description: "Elevated Green Line station serving the Arumbakkam residential locality near Koyambedu.",
  tags: ["transport", "transit", "residential"], storytelling_notes: "Unremarkable-but-essential scenes.", time_context: {}, micro_locations: [] },

{ name: "CMBT Metro Station", area_type: "transport", lat: 13.0697, lng: 80.2019,
  description: "Elevated Green Line station directly serving the Chennai Mofussil Bus Terminus — the city's biggest bus hub, connecting all of Tamil Nadu.",
  tags: ["transport", "transit", "accessible", "inclusive"],
  storytelling_notes: "Stories of inclusion, building for all of Chennai not just the premium segment. The diversity of the city on display.",
  time_context: { morning: "Thousands of interstate-bus passengers flowing through.", night: "Overnight buses departing to every district of Tamil Nadu." },
  micro_locations: [] },

{ name: "Koyambedu Metro Station", area_type: "transport", lat: 13.0700, lng: 80.1965,
  description: "Elevated Green Line station beside the Koyambedu wholesale market and metro depot.",
  tags: ["transport", "transit", "market"], storytelling_notes: "Supply-chain-meets-city scenes.", time_context: {}, micro_locations: [] },

{ name: "Thirumangalam Metro Station", area_type: "transport", lat: 13.0735, lng: 80.2130,
  description: "Underground Green Line station at a major Anna Nagar junction.",
  tags: ["transport", "transit"], storytelling_notes: "Junction-of-options scenes.", time_context: {}, micro_locations: [] },

{ name: "Anna Nagar Tower Metro Station", area_type: "transport", lat: 13.0863, lng: 80.2095,
  description: "Underground Green Line station directly beneath the Anna Nagar Tower landmark.",
  tags: ["transport", "transit", "landmark"], storytelling_notes: "Arrival-at-a-known-landmark scenes.", time_context: {}, micro_locations: [] },

{ name: "Anna Nagar East Metro Station", area_type: "transport", lat: 13.0865, lng: 80.2200,
  description: "Underground Green Line station serving eastern Anna Nagar.",
  tags: ["transport", "transit", "residential"], storytelling_notes: "Residential-routine scenes.", time_context: {}, micro_locations: [] },

{ name: "Shenoy Nagar Metro Station", area_type: "transport", lat: 13.0820, lng: 80.2330,
  description: "Underground Green Line station serving the Shenoy Nagar residential locality.",
  tags: ["transport", "transit", "residential"], storytelling_notes: "Everyday-commute scenes.", time_context: {}, micro_locations: [] },

{ name: "Pachaiyappa's College Metro Station", area_type: "transport", lat: 13.0800, lng: 80.2480,
  description: "Underground Green Line station beside the historic Pachaiyappa's College.",
  tags: ["transport", "transit", "education"], storytelling_notes: "Education-as-foundation scenes.", time_context: {}, micro_locations: [] },

{ name: "Nehru Park Metro Station", area_type: "transport", lat: 13.0805, lng: 80.2600,
  description: "Underground Green Line station near Nehru Park, one of the first underground stretches opened in 2017.",
  tags: ["transport", "transit", "green"], storytelling_notes: "Breakthrough-after-long-wait scenes.", time_context: {}, micro_locations: [] },

{ name: "Egmore Metro Station", area_type: "transport", lat: 13.0780, lng: 80.2610,
  description: "Underground Green Line station directly connected to Egmore railway station.",
  tags: ["transport", "transit", "interchange"], storytelling_notes: "Multi-modal-journey scenes.", time_context: {}, micro_locations: [] },

// ───────────────────────── SUBURBAN RAIL & BUS TERMINI ─────────────────────────
{ name: "Tambaram Railway Station", area_type: "transport", lat: 12.9246, lng: 80.1000,
  description: "Major suburban rail terminus on the Chennai Beach–Tambaram line, a key commuter gateway for the southwestern suburbs.",
  tags: ["transport", "transit", "suburban"], storytelling_notes: "Long-commute-as-thinking-time scenes.", time_context: {}, micro_locations: [] },

{ name: "Chennai Beach Railway Station", area_type: "transport", lat: 13.0930, lng: 80.2920,
  description: "Northern terminus of the suburban rail network, beside the harbour, one of the oldest stations in the city.",
  tags: ["transport", "transit", "historic"], storytelling_notes: "End-and-beginning scenes — a terminus that's also a starting point.", time_context: {}, micro_locations: [] },

{ name: "Fort Railway Station (MGR Chennai Central area)", area_type: "transport", lat: 13.0905, lng: 80.2900,
  description: "Historic suburban station beside Fort St. George, an early hub of Madras's rail network.",
  tags: ["transport", "transit", "historic"], storytelling_notes: "Old-infrastructure-still-running scenes.", time_context: {}, micro_locations: [] },

{ name: "Velachery MRTS Station", area_type: "transport", lat: 12.9790, lng: 80.2210,
  description: "Elevated MRTS (Mass Rapid Transit System) station serving the fast-growing Velachery suburb.",
  tags: ["transport", "transit", "growing"], storytelling_notes: "Growth-infrastructure-catching-up scenes.", time_context: {}, micro_locations: [] },

{ name: "Thirumayilai (Mylapore) MRTS Station", area_type: "transport", lat: 13.0310, lng: 80.2710,
  description: "Elevated MRTS station serving Mylapore, offering striking views over the temple tank and old neighborhood rooftops.",
  tags: ["transport", "transit", "cultural"], storytelling_notes: "Old-meets-new vantage-point scenes.", time_context: {}, micro_locations: [] },

{ name: "Kilambakkam Bus Terminus", area_type: "transport", lat: 12.8720, lng: 80.1280,
  description: "Chennai's newest and largest integrated bus terminus, on GST Road, designed to decongest the city's southern transit network.",
  tags: ["transport", "transit", "growth"], storytelling_notes: "Future-infrastructure-being-built scenes.", time_context: {}, micro_locations: [] },

{ name: "Chennai Mofussil Bus Terminus (CMBT) ground level", area_type: "transport", lat: 13.0697, lng: 80.2019,
  description: "The ground-level bus concourse beneath the CMBT metro station — Chennai's main interstate and intercity bus hub, in constant motion day and night.",
  tags: ["transport", "accessible", "inclusive", "bustling"],
  storytelling_notes: "Stories of inclusion, building for all of Chennai not just the premium segment. The diversity of the city on display.",
  time_context: { night: "Buses idling, vendors selling tea and snacks to waiting passengers." }, micro_locations: [] },

// ───────────────────────── ADDITIONAL STREETS, NEIGHBORHOODS & LANDMARKS ─────────────────────────
{ name: "Mount Road (Anna Salai) showroom stretch", area_type: "street", lat: 13.0625, lng: 80.2630,
  description: "The original 'Mount Road' — now Anna Salai — Chennai's first major commercial showroom street, anchoring banks, insurance offices, and car showrooms since colonial times.",
  tags: ["commercial", "historic", "business"], storytelling_notes: "Old-money-meets-new-ambition scenes.", time_context: {}, micro_locations: [] },

{ name: "Greams Road", area_type: "street", lat: 13.0605, lng: 80.2510,
  description: "Short but dense medical and commercial street near Anna Salai, home to Apollo Hospitals and several corporate offices.",
  tags: ["medical", "commercial"], storytelling_notes: "Health-and-business-intersection scenes.", time_context: {}, micro_locations: [] },

{ name: "Nungambakkam High Road", area_type: "street", lat: 13.0640, lng: 80.2440,
  description: "Major Nungambakkam thoroughfare connecting to the railway station, lined with offices, schools, and the historic YMCA.",
  tags: ["commercial", "historic"], storytelling_notes: "Steady-thoroughfare scenes — the road everyone passes through on the way to somewhere bigger.", time_context: {}, micro_locations: [] },

{ name: "Nungambakkam Railway Station", area_type: "transport", lat: 13.0625, lng: 80.2440,
  description: "Suburban rail station serving Nungambakkam, a quiet, leafy stop compared to the city's larger termini.",
  tags: ["transport", "transit"], storytelling_notes: "Small-station-big-neighborhood scenes.", time_context: {}, micro_locations: [] },

{ name: "Adyar Signal / LB Road junction", area_type: "street", lat: 13.0070, lng: 80.2545,
  description: "Busy Adyar junction at the intersection of Lattice Bridge Road, lined with bookstores, banks, and small businesses.",
  tags: ["commercial", "residential"], storytelling_notes: "Daily-decision-point scenes.", time_context: {}, micro_locations: [] },

{ name: "Kotturpuram", area_type: "neighborhood", lat: 13.0210, lng: 80.2440,
  description: "Quiet riverside neighborhood between Adyar and Saidapet, known for its proximity to the Adyar river and a mellow, residential character.",
  tags: ["residential", "peaceful"], storytelling_notes: "In-between-stages-of-life scenes.", time_context: {}, micro_locations: [] },

{ name: "Alwarpet", area_type: "neighborhood", lat: 13.0335, lng: 80.2540,
  description: "Upscale, leafy neighborhood between Mylapore and Nungambakkam, known for boutique stores, music academies, and a refined, quiet character.",
  tags: ["premium", "cultural", "residential"], storytelling_notes: "Refined-ambition scenes — quiet confidence rather than loud hustle.", time_context: {}, micro_locations: [] },

{ name: "Raja Annamalaipuram (RA Puram)", area_type: "neighborhood", lat: 13.0275, lng: 80.2580,
  description: "Quiet, affluent residential pocket between Alwarpet and Adyar, known for its calm streets and proximity to both the river and the sea.",
  tags: ["residential", "premium", "peaceful"], storytelling_notes: "Settled-success scenes.", time_context: {}, micro_locations: [] },

{ name: "Kotturpuram Bridge / Adyar riverfront walk", area_type: "park", lat: 13.0225, lng: 80.2460,
  description: "Riverside walking stretch along the Adyar near Kotturpuram, a quieter alternative to the more crowded Marina or Besant Nagar promenades.",
  tags: ["peaceful", "green", "river"], storytelling_notes: "Solitary-walk-and-think scenes.", time_context: {}, micro_locations: [] },

{ name: "Express Avenue Mall, Royapettah", area_type: "landmark", lat: 13.0580, lng: 80.2660,
  description: "Major shopping mall on Whites Road near Royapettah, a popular meeting point and multiplex destination for central Chennai.",
  tags: ["shopping", "commercial", "meetings"], storytelling_notes: "Casual-meeting and team-outing scenes.", time_context: {}, micro_locations: [] },

{ name: "Phoenix MarketCity, Velachery", area_type: "landmark", lat: 12.9910, lng: 80.2185,
  description: "One of Chennai's largest malls, anchoring Velachery's transformation from a quiet suburb into a major commercial hub.",
  tags: ["shopping", "commercial", "growth"], storytelling_notes: "Suburb-to-destination growth-story scenes.", time_context: {}, micro_locations: [] },

{ name: "Forum Vijaya Mall, Vadapalani", area_type: "landmark", lat: 13.0525, lng: 80.2120,
  description: "Large mall at the Vadapalani junction, near the metro station and the Murugan temple — a modern layer over an old crossroads.",
  tags: ["shopping", "commercial"], storytelling_notes: "Old-crossroads-new-commerce scenes.", time_context: {}, micro_locations: [] },

{ name: "Marina Lighthouse", area_type: "landmark", lat: 13.0445, lng: 80.2790,
  description: "Chennai's iconic red-and-white striped lighthouse at the southern end of Marina Beach, one of the few lighthouses worldwide accessible by elevator for public viewing.",
  tags: ["iconic", "beach", "perspective"], storytelling_notes: "Guiding-light-in-uncertainty visual metaphor.", time_context: { night: "Beam sweeping over the dark surf." }, micro_locations: [] },

{ name: "Spencer Plaza", area_type: "landmark", lat: 13.0608, lng: 80.2614,
  description: "One of India's oldest shopping complexes on Anna Salai, a multi-story maze of small shops that has weathered fires and decades of change while staying in business.",
  tags: ["commercial", "historic", "resilient"], storytelling_notes: "Resilience-through-setbacks scenes — a business that has survived disaster and reinvention more than once.", time_context: {}, micro_locations: [] },

{ name: "Island Grounds", area_type: "park", lat: 13.0700, lng: 80.2730,
  description: "Large open exhibition and event grounds between the Cooum river and Anna Salai, host to trade fairs, exhibitions, and public events.",
  tags: ["open", "events", "central"], storytelling_notes: "Big-launch and product-unveiling scenes.", time_context: {}, micro_locations: [] },

];

async function seed() {
  console.log(`Seeding ${chennaiAreas.length} Chennai areas...`);

  const { error: deleteError } = await supabase
    .from('chennai_areas')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.error('Failed to clear existing data:', deleteError.message);
  }

  // Insert in batches to stay well under request size limits.
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < chennaiAreas.length; i += BATCH_SIZE) {
    const batch = chennaiAreas.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from('chennai_areas').insert(batch).select();
    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      process.exit(1);
    }
    inserted += data.length;
    console.log(`  ...inserted ${inserted}/${chennaiAreas.length}`);
  }

  console.log(`✅ Successfully seeded ${inserted} Chennai areas.`);
  console.log(`Next: run "node database/embedChennaiAreas.js" to backfill semantic embeddings.`);
  process.exit(0);
}

seed();
