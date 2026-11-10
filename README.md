# Glow Globe

A logic puzzle on a night-time map of the world. In every country, light **every city exactly once**, starting at the power plant and ending at the star goal. Every level has **exactly one solution**. Each continent adds a new rule. Finish every country of a continent to light the continent (with a picture of it glowing at night and a silly fact).

Made for **Super Free AI Game Jam #2**.

- **Platform:** browser, touch (phones) and mouse (PC). No install, no server.
- **One file:** everything is inside `index.html` (**~1.6 MB**; 6 continent pictures and 36 country scenes are embedded as WebP data URLs). It works fully offline, just open it, or upload it to itch.io (zip ~1.2 MB).
- **Content:** 6 continents, 36 levels (Europe 6, Oceania 7, South America 6, Africa 6, North America 5, Asia 6), 256 cities, 6-9 cities per level (the first levels of every continent have 6-7). English only.
- **Difficulty (round 6):** only four simple rules are left: the basics, number clues, one-way roads and A-before-B order arrows. Every continent teaches its rule on a small first level (6-7 cities, at most 3-4 one-way roads or 1 order arrow). A level never uses more than 2 rule types before Asia; Asia mixes 2 types in its first three levels and 3 at the end. The generator (`tools/gen-puzzles.mjs`) caps every road kind per level (`cap`) and the number of cities (`max`); levels keep exactly one solution. The map projection uses cos(latitude) on the longitude, so countries keep their real shape.
- **Rules per continent:** Europe - the basics only (start at the lightning power plant, light every city exactly once along the roads, finish at the star, ONE solution); Oceania - number clues (the city must be the Nth lit); South America - one-way roads (plus a few number clues); Africa - order arrows (a purple dotted arrow A -> B: light A before B); North America - a gentle mix of 2 rules (numbers, one-way roads, order arrows); Asia - mixes of 2-3 rules, hardest.
- **Onboarding:** the FIRST time a player opens a level on any continent (Europe or not, in any order) a short intro "WELCOME TO <continent>" explains the goal and shows a drawn example of every rule used on that continent (the list is derived from the real levels). It is remembered per continent (`seen['c:<id>']`). The "?" button always shows the rules of the current level.
- **Controls and stars:** Undo is the only control you need while playing: tap = one step back, hold 0.6 s = restart the level (a restart counts as one undo for the stars). Dead ends show a message, shake, and the Undo button pulses. 3 stars per level: solved with no undo = 3, 1-3 undos = 2, more = 1 (a restart counts as one undo); replay for 3. Progress auto-saves to `localStorage` (save v4 plus a layout version `lv`=5; v3/v4 saves are migrated: finished countries and stars are kept, routes in progress and undo counts from an older layout are reset, old rule-card flags are mapped to the continent intros; v1/v2 saves came from the old connect-the-dots versions, so they start clean). The continent message ("Europe is alight!") appears only once, when the LAST country of a continent is finished; "Next country" always goes to the next unfinished country of the same continent, and a replay of a finished country goes back to the country list..
- **Readable roads (round 7):** every road has a dark casing, a soft glow, a bright body and a faint center line (width scales with the screen); the roads you can take next pulse in gold with moving dashes; the gold route follows the same lines. A road that would run through a third city or leave a city almost parallel to another road bends into a gentle curve (`planRoads`, chosen per level and screen size), so every road can be followed by eye. Tap tolerance: 50 px on touch / 34 px with a mouse; a tap that lands squarely on a dot always picks it, a close call goes to a move you can really make, and the highlighted dot follows a dragging finger until release. Tiny islands that map simplification had collapsed into a stray line segment (e.g. next to Port Lincoln) are now small island shapes (`tools/fix-rings.mjs`).
- **Juice:** ring + glow pop on every city, light wave over the route and a bloom when a country is finished, rising pentatonic notes, vibration on phones.
- **Country card:** finishing a level shows an AI-generated 480x320 night scene of the country (one landmark/landscape each) and a short true fun fact; finished countries get a thumbnail in the country list.

## How AI was used (also shown in the game, menu -> "How AI made this")

- **Design & code:** the game design, all of the code and the puzzle generator were made with AI (Grok).
- **Puzzles:** a generator and an exhaustive solver, both written with AI, built every level and checked that it has exactly one solution and uses its rules.
- **Images:** the six continent pictures and the 36 country scenes were generated with an AI image generator and then compressed to fit inside one file.
- **Words:** the fun facts (in `tools/facts.json`) and the continent jokes were written with AI help; the facts are well-known, checkable ones.
- **The human:** Stefan directed the project, playtested every version and picked the images.
- **Sound:** synthesized in the browser (Web Audio), no samples. **Map:** Natural Earth (public domain), simplified.

Made by Stefan (najxosk).

## Project structure

- `index.html` - the finished game. **This is the deliverable and the source of truth for v2.**
- `art/*.webp` - the compressed continent pictures embedded in `index.html` (`CONT_IMG`); `art/country/*.webp` - the 36 country scenes (`CTRY_IMG`). The full-size originals (`art/src-*.jpg`, `art/src-c-*.jpg`) are not tracked.
- `tests/verify.mjs` - `node tests/verify.mjs`: an independent brute-force solver proves every level has exactly one solution and agrees with the in-game rule engine; rule placement per continent, difficulty curve, rule unit tests, save migration, no placeholders.
- `tests/e2e.py` - `python3 tests/e2e.py`: Playwright (390x844 touch + 1280x720 mouse) solves the first two levels of every continent with real taps, checks the continent intro on every continent (also when starting on a non-Europe continent), save migration, illegal-move messages, dead end + Undo (tap and long-press), undo-based stars, the country card (image + fun fact), persistence, v2-save migration, label overlaps, tap precision, button sizes and the console.
- `tools/gen-puzzles.mjs` - the level generator: builds a hidden route, places rules consistently, adds decoy roads and prunes clues while the solution stays unique, measures hardness and orders the levels. Writes `DATA` and `PUZ` into `index.html` (`node tools/gen-puzzles.mjs`, ~45 s; `SEED=n` changes the random seed). `tools/data-base.json` holds the base cities and facts.
- `tools/make-country-art.py` - compresses `art/src-c-*.jpg` to `art/country/*.webp` (480x320, tuned to ~20 KB each). `tools/facts.json` - the 36 fun facts.
- `tools/fix-outlines.mjs` - replaces the Jamaica and Egypt outlines by simplified Natural Earth 50m shapes (needs `/tmp/ne50.geojson`; idempotent).
- `tools/fix-rings.mjs` - replaces degenerate map rings by small lens-shaped islands (idempotent).
- `tools/make-itch-assets.py`, `tools/make-cover.py` - build the itch.io screenshots, GIF and cover from the real game.
- `itch/` - the itch.io kit (page text, cover, screenshots, GIF, upload zip).
- `build.mjs` - **legacy** generator of the first version of `index.html`. It needs the original TypeScript sources (`../grok-workspace`), which are not available any more, and it does not know the v2 changes. v2 was edited directly in `index.html`; do not rebuild with it.

## Credits

Map data: [Natural Earth](https://www.naturalearthdata.com/) (public domain). Everything else: see "How AI was used".
