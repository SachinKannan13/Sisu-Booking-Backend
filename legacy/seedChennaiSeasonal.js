import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================
// Seasonal context + inter-area routes for BookSphere storytelling.
//
// Chennai's climate has a distinctive rhythm that most of India does
// not share: the bulk of its rain falls Oct-Nov (the retreating /
// northeast monsoon off the Bay of Bengal), not Jun-Sep. This file
// encodes that rhythm per-location so story prose can feel like it
// actually knows the city in the month the story is generated.
//
// Area names below are matched with ILIKE against the names already
// seeded by seedChennai.js -- keep them exact substrings of those names.
//
// NOTE: all strings here are double-quoted and ASCII-only on purpose
// (no em dashes, no curly quotes/apostrophes) to avoid any encoding
// issues writing/reading this file across tools.
// ============================================================

const SEASONAL_DATA = [
  {
    name: "Marina Beach",
    seasonal_context: {
      jan_feb: "Post-Pongal Marina is festive and a little battered -- kite string and coconut-shell litter still turning up in the sand weeks later. The sea is choppy with the tail end of the northeast monsoon swell, the air is the coolest it will be all year, and the 5am walking crowd is at its biggest.",
      mar_may: "By March the heat turns aggressive enough that the beach is only really alive at dawn -- joggers, fishermen hauling in early catches, vendors setting up before the sand starts to burn bare feet. By May it is close to empty past 8am; the Bay looks flat, hazy, and uninviting in the white midday light.",
      jun_sep: "The southwest monsoon barely touches Chennai directly, but the run-up is humid and heavy, and the sea turns a deep, churned green in the days before a depression forms in the Bay. Surprise short showers happen but rarely last. The beach has a raw, slightly abandoned feel -- locals stay away, which gives it an unusually private, powerful energy for anyone who comes anyway.",
      oct_nov: "This is when Chennai's real monsoon arrives. Marina can close outright during a cyclone warning; the surf turns dangerous and brown with runoff, the sky stays a flat grey for days, and the morning after a big storm the sand is littered with debris and driftwood in a way that is oddly beautiful. Locals call this the city's most dramatic season, and Marina is its most dramatic stage.",
      dec: "December is Marina at its best: cool mid-20s Celsius mornings, joggers and walkers packing the promenade by 5:30am, a clean and cool sunrise over the Bay. It overlaps with Margazhi, the citywide cultural season, so there is a sense of festival energy even on a plain Tuesday morning."
    }
  },
  {
    name: "Nungambakkam",
    seasonal_context: {
      jan_feb: "The coolest, most pleasant months of the year here -- cafe courtyards on Khader Nawaz Khan Road fill early and stay full, outdoor seating is actually comfortable, and there is a citywide sense of new-year energy that startup founders lean into for pitches and resets.",
      mar_may: "Air conditioning becomes load-bearing infrastructure. The tree cover on the older streets helps a little, but by April nobody is sitting outside past 10am, and the serious conversations -- term sheets, pivots, hard calls -- all happen indoors over high-effort cold coffee.",
      jun_sep: "Humid but tolerable; the mature trees along the Boat Club and KNK Road area keep it a few degrees cooler than the rest of the city. By August, evenings are pleasant enough for outdoor dinners again, and there is a quiet uptick in new ventures launching ahead of year-end.",
      oct_nov: "Short, intense downpours flood the low points near the railway underpass and can waterlog stretches of KNK Road within twenty minutes. The covered courtyard at Amethyst (and others like it) becomes the unofficial rainy-day office for half of Nungambakkam's consulting crowd.",
      dec: "Margazhi season brings pop-up art shows, gallery openings, and a general mixing of Chennai's classical-arts crowd with its startup crowd -- the kind of cross-pollination this neighbourhood is known for. String lights go up on KNK Road; the whole area feels slightly more like a festival than a business district."
    }
  },
  {
    name: "OMR (Old Mahabalipuram Road)",
    seasonal_context: {
      jan_feb: "Pleasant enough that the walk from the cab drop to the office lobby doesn't feel like a small ordeal. The IT corridor has a brisk, purposeful energy in January -- new fiscal-year plans, headcount conversations, that particular optimism that fades by March.",
      mar_may: "Brutal. OMR is a long, largely shadeless highway, and by April the tarmac itself seems to radiate heat back at the cars idling in traffic. Tech park lobbies seal up; the short walk between the cab and the building becomes the worst part of anyone's day. Lunch rushes concentrate hard into the handful of decent food-court options.",
      jun_sep: "The wetlands flanking OMR (especially near Perungudi) make this stretch noticeably more humid than the rest of the city even before the real rains start. Evening drives home take on a misty, slightly eerie quality with the marsh fog rolling in.",
      oct_nov: "OMR is notorious for waterlogging during the northeast monsoon, particularly around Perungudi and Sholinganallur -- sections can go fully impassable for hours. Work-from-home spikes hard across the whole corridor; the people who do come in talk about it like a small expedition.",
      dec: "Mild, dry, and productive -- IT parks run at full capacity pushing year-end deliverables. The Pallikaranai marsh alongside the corridor fills with migratory birds in winter, an odd, quiet contrast to the glass towers next to it."
    }
  },
  {
    name: "Mylapore",
    seasonal_context: {
      jan_feb: "Post-Pongal Mylapore is full of silk and jasmine -- wedding season overlaps with the cooler weather, and Sannathi Street is busy from early morning with flower vendors restocking for both temple rituals and bridal parties.",
      mar_may: "The temple tank at Kapaleeshwarar stays in shade most of the morning, making it one of the few genuinely comfortable outdoor spots in the neighbourhood by April. Afternoons empty the lanes almost completely; even the temple crowd thins to the truly devoted.",
      jun_sep: "Humid, but the narrow shaded lanes around the temple keep Mylapore a few degrees more bearable than open areas. Evening crowds at Karpagambal Mess and along Sannathi Street pick back up once the worst of the afternoon heat breaks.",
      oct_nov: "Heavy rain turns the lanes around the temple tank slick and reflective; the tank itself can rise high enough to touch the lowest steps. Locals describe a particular Mylapore smell after the first big rain -- wet stone, incense, and jasmine all at once.",
      dec: "Margazhi is Mylapore's season. Pre-dawn Carnatic concerts (the famous Margazhi mornings) happen in sabhas across the neighbourhood, the air is cool and clear, and Sannathi Street is at its most atmospheric -- kolam powder, temple lights, and music drifting out of open hall doors before sunrise."
    }
  },
  {
    name: "Adyar",
    seasonal_context: {
      jan_feb: "Cool mornings bring mist over the Adyar river estuary near the bridge; the Theosophical Society's gardens are at their greenest and most walkable, and the area's usual bookish quiet feels even more pronounced.",
      mar_may: "The Theosophical Society's old-growth tree canopy (including one of the largest banyan trees in Asia) makes it one of the few places in the city that stays genuinely cool by midday -- a known refuge for anyone needing to think clearly without air conditioning.",
      jun_sep: "Humid and still; the river estuary can smell stronger than usual before the rains properly start. Evening walkers still gather at the Adyar bridge, watching for the first real cloudburst of the season out over the Bay.",
      oct_nov: "The Adyar river, normally sluggish, swells fast during heavy northeast monsoon spells and can flood low-lying approach roads. The bridge becomes a popular, slightly nervous spot to watch the water rise.",
      dec: "Crisp, quiet, and contemplative -- exactly the register Adyar is known for. The Theosophical Society gardens are busiest with morning walkers taking advantage of the rare cool, dry stretch before the heat returns in February."
    }
  },
  {
    name: "Besant Nagar",
    seasonal_context: {
      jan_feb: "Breezy and comfortable; Elliot's Beach has its biggest morning crowds of the year, with yoga groups, joggers, and families all making the most of the cool air before it disappears in March.",
      mar_may: "Hot and mostly empty by day -- the sand becomes unbearable to walk on barefoot by 9am. The neighbourhood essentially shifts its entire outdoor social life to after 6pm, when the sea breeze finally cuts through the heat.",
      jun_sep: "The sea breeze that defines this neighbourhood is at its most reliable here, making Besant Nagar noticeably more livable through the humid months than inland areas just a few kilometres away.",
      oct_nov: "Rough surf and occasional beach closures during storm warnings; the police clear the sand earlier than usual on bad-weather evenings. Still, the 5th Avenue restaurant row stays busy regardless -- it is the one part of the routine the rain doesn't really interrupt.",
      dec: "Arguably the neighbourhood's best month -- cool evening air, calm sea, and the beach packed with families, kite-fliers, and sundal vendors from late afternoon until the police clear the sand around 10pm."
    }
  },
  {
    name: "T. Nagar",
    seasonal_context: {
      jan_feb: "Wedding and Pongal-season shopping pushes Ranganathan Street and Pondy Bazaar to some of their busiest crowds of the year -- silk, gold, and gift shopping all peak here in these two months.",
      mar_may: "The heat does nothing to slow T. Nagar down; if anything, summer wedding season keeps the crowds constant. Shopkeepers and porters work through the worst of the afternoon heat because the customers never really stop coming.",
      jun_sep: "Humid and crowded as ever -- T. Nagar's energy doesn't really respond to weather. The one visible change is more umbrellas-as-parasols among the shoppers on Ranganathan Street.",
      oct_nov: "Heavy rain can flood the lower stretches near the bus terminus and slow the area to a crawl, but the pedestrian section of Pondy Bazaar -- partially built up -- keeps functioning even in a downpour, just with everyone pressed under the shop awnings.",
      dec: "Pre-wedding-season and pre-Pongal shopping rush builds steadily through the month; by the last week, Ranganathan Street is shoulder-to-shoulder from morning to night."
    }
  },
  {
    name: "Anna Nagar",
    seasonal_context: {
      jan_feb: "Cool mornings bring the biggest crowds of the year to Anna Nagar Tower Park -- walkers, joggers, and badminton games all happening before 8am while the air is still comfortable.",
      mar_may: "Quiet, shuttered afternoons; the wide tree-lined avenues that make Anna Nagar pleasant most of the year still provide more shade than most Chennai neighbourhoods, which keeps it slightly more bearable than the commercial districts nearby.",
      jun_sep: "Humid evenings, but the park and avenues stay usable -- Anna Nagar's planned, green layout is one of its real advantages in this stretch of the year.",
      oct_nov: "Well-engineered drainage compared to older parts of the city means flooding here is less severe than T. Nagar or OMR, though the Tower Park itself can get waterlogged enough to keep walkers away for a few days after a big storm.",
      dec: "A genuinely lovely month here -- clear skies, cool evenings, families filling the park, and the wide 2nd Avenue stretch lit up for the season."
    }
  },
  {
    name: "Chennai Central",
    seasonal_context: {
      jan_feb: "Busy with the post-holiday travel rush easing off; the grand old station building is at its most photogenic in the soft, cool morning light that floods through its high windows.",
      mar_may: "Hot and crowded -- Chennai Central in peak summer is a study in endurance, with travellers parked under every available fan and shaft of shade on the platforms while waiting for delayed trains.",
      jun_sep: "Humid but business-as-usual; the station's high ceilings and old-fashioned ventilation actually do a reasonable job of keeping the main concourse from feeling as oppressive as the streets outside.",
      oct_nov: "Monsoon delays ripple through the whole network from here -- northeast monsoon rain regularly disrupts the suburban and long-distance lines alike, and the area immediately outside the station can flood enough to strand autos and taxis.",
      dec: "Festive travel season; the station is at its most crowded with people heading home for the year, mixed with Margazhi-season visitors arriving for Chennai's music and dance season."
    }
  },
  {
    name: "Fort St. George",
    seasonal_context: {
      jan_feb: "Cool enough to actually enjoy walking the old fort grounds and the museum without rushing for shade -- one of the more comfortable months to take in the colonial-era architecture at a slow pace.",
      mar_may: "The exposed, largely unshaded fort grounds get genuinely punishing by midday in summer; visits are best kept to early morning, when the old ramparts and St. Mary's Church are still in shadow.",
      jun_sep: "Quiet and humid; this isn't a peak-tourist stretch, which actually makes it one of the better times to wander the grounds without crowds.",
      oct_nov: "The fort's proximity to the harbour means it catches the brunt of northeast monsoon weather directly off the Bay -- dramatic skies over the old ramparts, though heavy rain can close the museum for the day.",
      dec: "Pleasant and historically resonant -- cool weather plus the surrounding Margazhi season give the old fort a particular gravitas, history and culture both very present in the same few weeks."
    }
  },
  {
    name: "Koyambedu",
    seasonal_context: {
      jan_feb: "Peak produce season after the harvest -- the wholesale market is at its most chaotic and abundant, mountains of vegetables and flowers moving through before dawn for Pongal-season demand.",
      mar_may: "Brutal heat starting as early as 6am once the sun is up; market work happens almost entirely in the pre-dawn hours specifically because of this. By 10am the market is winding down and the heat has the upper hand.",
      jun_sep: "Humid, with the smell of the market -- fruit, flowers, fish from the adjoining sections -- sitting heavier in the air than in cooler months.",
      oct_nov: "Flooding around Koyambedu can disrupt supply chains for the whole city; the wholesale market's low-lying access roads are some of the first in Chennai to go under during a heavy spell.",
      dec: "Steady, high-volume trading as the city gears up for festival and wedding season demand; one of the more reliably bustling stretches of the year here regardless of weather."
    }
  },
  {
    name: "IIT Madras Research Park",
    seasonal_context: {
      jan_feb: "The campus's dense tree cover (it sits inside Guindy National Park's green belt) makes for genuinely pleasant January walks between buildings -- deer occasionally visible at the campus edges in the cool early morning.",
      mar_may: "Even with the forest cover, summer heat is serious by midday; most movement between buildings happens early or via the shaded inner pathways. The campus deer retreat deeper into the park.",
      jun_sep: "Humid, green, and quiet -- the forest setting means this campus handles the pre-monsoon months better than most of the city, staying noticeably cooler than OMR just a few kilometres away.",
      oct_nov: "Heavy rain turns the wooded campus genuinely lush, though waterlogging on the access roads from the main highway can make the commute in difficult during the worst spells.",
      dec: "One of the most pleasant places in the city to be outdoors this month -- cool air, green cover, and the kind of quiet that suits deep-tech founders and researchers working through hard problems."
    }
  },
  {
    name: "Mahabalipuram",
    seasonal_context: {
      jan_feb: "Cool sea breeze and clear skies make this the best stretch of the year to actually walk the Shore Temple grounds at length; the stone carvings are sharpest in the low, raking morning light.",
      mar_may: "Hot, glaring, and best visited at dawn -- the exposed granite of the Shore Temple and surrounding rock-cut monuments radiates heat back hard by mid-morning.",
      jun_sep: "Humid coastal air; the waves are generally calmer here than during the monsoon, making it a quieter, if sultry, stretch for the site.",
      oct_nov: "Rough surf and dramatic skies over the Shore Temple -- this UNESCO site set right against the Bay of Bengal is at its most cinematic during a monsoon swell, waves crashing close to the ancient stone.",
      dec: "Cool, clear, and busy with both domestic and international visitors taking advantage of the pleasant weather; the temple grounds at golden hour in December are one of the most photographed scenes near Chennai."
    }
  },
  {
    name: "Vadapalani",
    seasonal_context: {
      jan_feb: "The Murugan Temple sees heavy footfall around Thaipusam preparations; cool weather makes the temple queues and the surrounding shopping stretch far more bearable than usual.",
      mar_may: "Hot and crowded regardless -- Vadapalani's mix of temple traffic and film-industry offices nearby keeps the area busy through the heat, with everyone moving a little slower by afternoon.",
      jun_sep: "Humid and steady; the temple's covered corridors offer real relief from both sun and the occasional shower, and remain busy with devotees year-round.",
      oct_nov: "Heavy rain can back up traffic badly along Arcot Road; the temple itself handles the rain well thanks to its covered mandapams, but the surrounding shopping streets get the worst of the waterlogging.",
      dec: "Festival-adjacent energy carries through the month with steady temple crowds and pleasant evening weather for the shopping stretch around Forum Vijaya Mall."
    }
  },
  {
    name: "Porur",
    seasonal_context: {
      jan_feb: "Porur Lake's bund road is at its most pleasant for an evening walk or run, cool air carrying off the water; one of the western suburbs' better-kept outdoor spots this time of year.",
      mar_may: "The lake recedes noticeably by peak summer, and the bund road loses some of its appeal without the water close by; the area's quick growth as a residential and IT-adjacent suburb means traffic remains the bigger story regardless of season.",
      jun_sep: "Humid; the lake begins to refill ahead of the main rains, and evening walkers return to the bund road as the worst of the heat breaks.",
      oct_nov: "Porur Lake can rise fast during heavy northeast monsoon spells, occasionally threatening nearby low-lying residential streets -- a recurring local concern during bad monsoon years.",
      dec: "Calm, cool, and a popular small escape for residents of the western suburbs -- the lake full, the bund road walkable, and considerably quieter than the city's more famous waterfronts."
    }
  }
];

const ROUTES_DATA = [
  {
    from_area: "Nungambakkam",
    to_area: "OMR (Old Mahabalipuram Road)",
    travel_time_mins: 35,
    travel_mode: "auto",
    route_description: "From the leafy streets of Nungambakkam, you join Rajiv Gandhi Salai near Tidel Park -- the unmistakable gateway into Chennai's IT corridor. The road widens to six lanes; tech park signboards (Cognizant, Infosys, TCS) line both sides almost without a break. Past the Perungudi flyover you catch a glimpse of the Pallikaranai marsh, an odd wild patch in the middle of all that glass and concrete. By Sholinganallur the traffic thickens and autos start weaving between buses. The whole trip feels like crossing from old-money Chennai into the city's working nervous system.",
    landmarks_en_route: ["Tidel Park", "Perungudi flyover", "Pallikaranai marsh view", "Sholinganallur junction"],
    weather_notes: "Adds 20-30 minutes in the northeast monsoon thanks to recurring waterlogging near Perungudi and Sholinganallur. In summer, the shadeless stretch makes this miserable in an auto after 10am."
  },
  {
    from_area: "Mylapore",
    to_area: "Marina Beach",
    travel_time_mins: 10,
    travel_mode: "auto",
    route_description: "A short ride that cuts through the heart of old Chennai -- past the Music Academy, around the memorial grounds, and then the Bay of Bengal appears almost without warning at the end of the road, a shock of open blue after the dense temple-town lanes. The air changes fast: salt, fish, sea wind. You come out onto Kamarajar Salai, the long promenade road that runs the length of the beach.",
    landmarks_en_route: ["Kapaleeshwarar Temple (behind you)", "Music Academy", "memorial grounds"],
    weather_notes: "Best at dawn, when the city is quiet, the sea is calm, and the road is yours. During the northeast monsoon, check for beach-closure warnings before making the trip."
  },
  {
    from_area: "Anna Nagar",
    to_area: "T. Nagar",
    travel_time_mins: 25,
    travel_mode: "auto",
    route_description: "From Anna Nagar's wide planned avenues, through Arumbakkam and into the tighter lanes that signal the approach to T. Nagar. Traffic density rises sharply over the Kodambakkam flyover, and by Panagal Park you're somewhere else entirely -- the ordered suburb behind you, the commercial chaos of Ranganathan Street and Pondy Bazaar dead ahead.",
    landmarks_en_route: ["Anna Nagar Tower", "Arumbakkam signal", "Kodambakkam flyover", "Panagal Park"],
    weather_notes: "Avoid weekday evenings 5-8pm, when T. Nagar's shopping rush and school traffic converge near Panagal Park into genuine gridlock."
  },
  {
    from_area: "Adyar",
    to_area: "Besant Nagar",
    travel_time_mins: 12,
    travel_mode: "walk",
    route_description: "One of the most pleasant short walks in the city -- across the Adyar bridge with the river estuary opening out on both sides, then a quiet residential stretch before the salt smell of Elliot's Beach takes over. Popular at sunset, when half of Adyar seems to be making the same walk for the same reason.",
    landmarks_en_route: ["Adyar bridge", "Theosophical Society perimeter wall", "Elliot's Beach approach"],
    weather_notes: "A genuine pleasure in the December-February cool season; best avoided on foot during peak summer afternoons or in the middle of a monsoon downpour, when the bridge offers no shelter at all."
  },
  {
    from_area: "Mylapore",
    to_area: "T. Nagar",
    travel_time_mins: 15,
    travel_mode: "auto",
    route_description: "A quick cut west along quiet residential roads before merging onto the busier commercial stretch near Panagal Park -- the transition from Mylapore's temple-town hush to T. Nagar's relentless commercial hum happens almost at a single intersection.",
    landmarks_en_route: ["Luz Corner", "Panagal Park approach"],
    weather_notes: "The Mylapore stretch handles rain well; the T. Nagar end can back up fast in a downpour due to the sheer density of foot and vehicle traffic."
  },
  {
    from_area: "Besant Nagar",
    to_area: "OMR (Old Mahabalipuram Road)",
    travel_time_mins: 30,
    travel_mode: "auto",
    route_description: "Heading inland from the coast along Rajiv Gandhi Salai, the breezy calm of Besant Nagar gives way within a few kilometres to the IT corridor's dense traffic and tech-park towers -- a clean illustration of Chennai's two different kinds of energy sitting just a short drive apart.",
    landmarks_en_route: ["Thiruvanmiyur signal", "IIT Madras campus wall", "Tidel Park"],
    weather_notes: "The IIT Madras forest stretch stays noticeably cooler than the open OMR sections on either side of it, a small relief in summer."
  },
  {
    from_area: "Egmore",
    to_area: "Mylapore",
    travel_time_mins: 20,
    travel_mode: "auto",
    route_description: "South from the old government-and-courts district of Egmore, past Gemini flyover and into the Mylapore tank area, where the architecture shifts from colonial-era institutional buildings to temple gopurams almost street by street.",
    landmarks_en_route: ["Egmore railway station", "Gemini flyover", "Luz Church Road"],
    weather_notes: "The Gemini flyover stretch handles monsoon traffic better than most of the city; expect delays only in the worst storms."
  },
  {
    from_area: "Koyambedu",
    to_area: "Anna Nagar",
    travel_time_mins: 15,
    travel_mode: "auto",
    route_description: "A short hop from the wholesale-market chaos of Koyambedu into Anna Nagar's calmer, tree-lined avenues -- the noise and crowding drop off almost immediately past the bus terminus.",
    landmarks_en_route: ["Koyambedu bus terminus", "CMBT"],
    weather_notes: "Koyambedu's low-lying access roads are among the first in the city to flood; allow extra time here specifically during October-November."
  },
  {
    from_area: "Fort St. George",
    to_area: "Marina Beach",
    travel_time_mins: 8,
    travel_mode: "walk",
    route_description: "A short walk east from the old fort's ramparts brings you out onto the open promenade, the colonial-era stone giving way to open sea and sky within a few minutes -- one of the more striking small transitions in the city.",
    landmarks_en_route: ["St. Mary's Church", "War Memorial"],
    weather_notes: "Both ends of this walk are fully exposed to the elements -- punishing in summer midday sun, and the first place to feel a northeast monsoon downpour roll in off the Bay."
  },
  {
    from_area: "IIT Madras Research Park",
    to_area: "Velachery",
    travel_time_mins: 15,
    travel_mode: "auto",
    route_description: "Out through the IIT Madras gate and along a short stretch that takes you from forested research-park calm into Velachery's busier, mall-and-IT-park energy in a matter of minutes.",
    landmarks_en_route: ["IIT Madras main gate", "Velachery 100 Feet Road"],
    weather_notes: "The 100 Feet Road stretch near Phoenix MarketCity is prone to slow-moving traffic in heavy rain due to drainage limitations."
  },
  {
    from_area: "Vadapalani",
    to_area: "Nungambakkam",
    travel_time_mins: 20,
    travel_mode: "auto",
    route_description: "East along Arcot Road and then into the quieter, leafier streets near Nungambakkam -- the film-studio and temple energy of Vadapalani giving way gradually to the consulting-office calm further along.",
    landmarks_en_route: ["Vadapalani Murugan Temple", "Arcot Road signal"],
    weather_notes: "Arcot Road near Vadapalani is a known waterlogging point during heavy spells; the Nungambakkam end clears faster."
  },
  {
    from_area: "Porur",
    to_area: "OMR (Old Mahabalipuram Road)",
    travel_time_mins: 40,
    travel_mode: "auto",
    route_description: "A longer cross-city run linking two of Chennai's growth suburbs -- west to east across some of the city's newer ring-road infrastructure, lake views giving way eventually to tech-park skyline.",
    landmarks_en_route: ["Porur Lake bund road", "Maduravoyal junction", "Chennai Bypass"],
    weather_notes: "This route benefits from newer drainage infrastructure along the bypass, making it comparatively more resilient than older inner-city roads during the monsoon -- though Porur Lake itself can still threaten nearby streets in a bad year."
  },
  {
    from_area: "Mahabalipuram",
    to_area: "Besant Nagar",
    travel_time_mins: 55,
    travel_mode: "ecr_drive",
    route_description: "The classic ECR drive north -- open coastline almost the entire way, the Bay of Bengal visible on and off through casuarina groves, past the Muttukadu boat house and a string of beach resorts before the city reasserts itself near Thiruvanmiyur and finally Besant Nagar.",
    landmarks_en_route: ["Muttukadu Boat House", "Covelong / Kovalam beach stretch", "Thiruvanmiyur signal"],
    weather_notes: "One of the most scenic drives in the region in good weather, and one of the more exposed ones in a storm -- high winds and surf spray are common along open stretches during the northeast monsoon."
  }
];

async function seed() {
  console.log('Seeding seasonal context for Chennai areas...');

  let updated = 0;
  for (const item of SEASONAL_DATA) {
    const { data, error } = await supabase
      .from('chennai_areas')
      .update({ seasonal_context: item.seasonal_context })
      .ilike('name', `%${item.name}%`)
      .select('id, name');

    if (error) {
      console.error(`Failed to update ${item.name}:`, error.message);
    } else if (!data || data.length === 0) {
      console.warn(`No matching chennai_areas row found for "${item.name}" -- skipped.`);
    } else {
      updated += data.length;
      console.log(`OK: updated seasonal context for "${item.name}" (${data.length} row(s) matched).`);
    }
  }

  console.log(`\nSeasonal context updated on ${updated} row(s).`);
  console.log('\nSeeding Chennai routes...');

  const { data: insertedRoutes, error: routeError } = await supabase
    .from('chennai_routes')
    .insert(ROUTES_DATA)
    .select('id');

  if (routeError) console.error('Route seeding failed:', routeError.message);
  else console.log(`OK: inserted ${insertedRoutes?.length || 0} routes.`);

  console.log('\nDone. Run "node database/embedChennaiAreas.js" next so the new seasonal text is reflected in the embeddings used for semantic search.');
}

seed().catch(err => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
