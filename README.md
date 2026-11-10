# Glow Globe

A logic puzzle on a night-time map of the world. In every country, light **every city exactly once**, starting at the power plant and ending at the star goal. Every level has **exactly one solution**. Each continent adds a new rule. Finish every country of a continent to light the continent (with a picture of it glowing at night and a silly fact).

Made for **Super Free AI Game Jam #2**.

- **Platform:** browser, touch (phones) and mouse (PC). No install, no server.
- **One file:** everything is inside `index.html` (**~1.6 MB**; 6 continent pictures and 36 country scenes are embedded as WebP data URLs). It works fully offline, just open it, or upload it to itch.io (zip ~1.2 MB).
- **Content:** 6 continents, 36 levels (Europe 6, Oceania 7, South America 6, Africa 6, North America 5, Asia 6), 275 cities, 6-10 cities per level. English only.
- **Rules, one new rule per continent (older rules stay on):** Europe - start (power plant), goal (star) and ONE solution; Oceania - number clues (the city must be the Nth lit); South America - one-way roads; Africa - locked gates (coloured road opens when the key city of that colour is lit); North America - fragile bridges (dashed; crossing one collapses ALL dashed bridges, so at most one can be used) and order arrows (A before B); Asia - all rules mixed, hardest.
- **Controls and stars:** Undo is the only button: tap = one step back, hold 0.6 s = restart the level. Dead ends show a message, shake, and the Undo button pulses. 3 stars per level: solved with no undo = 3, 1-3 undos = 2, more = 1 (a restart counts as one undo); replay for 3. Progress auto-saves to `localStorage` (save v4; v1-v3 saves are migrated: finished regions are kept, v3 stars are kept, v1/v2 stars and progress are reset).
- **Juice:** ring + glow pop on every city, light wave over the route and a bloom when a country is finished, rising pentatonic notes, vibration on phones.
- **Country card:** finishing a level shows an AI-generated 480x320 night scene of the country (one landmark/landscape each) and a short true fun fact; finished countries get a thumbnail in the country list.

## How AI was used (also shown in the game, menu -> "How AI made this")

- Concept, game design and all code: made with AI tools (Grok), directed and tested by a human.
- The six continent pictures and the 36 country scenes: generated with an AI image generator (prompt: iconic landmark at night, glowing with lights, no text, no people), then compressed (country scenes: 480x320 WebP, ~20 KB).
- The 36 fun facts and the continent jokes: written with AI help (facts are in `tools/facts.json`; well-known, checkable ones).
- Sound: synthesised live with Web Audio, no samples.
- Map data: Natural Earth (public domain), simplified (Douglas-Peucker).

Made by Stefan (najxosk).

## Project structure

- `index.html` - the finished game. **This is the deliverable and the source of truth for v2.**
- `art/*.webp` - the compressed continent pictures embedded in `index.html` (`CONT_IMG`); `art/country/*.webp` - the 36 country scenes (`CTRY_IMG`). The full-size originals (`art/src-*.jpg`, `art/src-c-*.jpg`) are not tracked.
- `tests/verify.mjs` - `node tests/verify.mjs`: an independent brute-force solver proves every level has exactly one solution and agrees with the in-game rule engine; rule placement per continent, difficulty curve, rule unit tests, save migration, no placeholders.
- `tests/e2e.py` - `python3 tests/e2e.py`: Playwright (390x844 touch + 1280x720 mouse) solves the first two levels of every continent with real taps, checks rule cards, illegal-move messages, dead end + Undo (tap and long-press), undo-based stars, the country card (image + fun fact), persistence, v2-save migration, label overlaps, tap precision, button sizes and the console.
- `tools/gen-puzzles.mjs` - the level generator: builds a hidden route, places rules consistently, adds decoy roads and prunes clues while the solution stays unique, measures hardness and orders the levels. Writes `DATA` and `PUZ` into `index.html` (`node tools/gen-puzzles.mjs`, ~45 s; `SEED=n` changes the random seed). `tools/data-base.json` holds the base cities and facts.
- `tools/make-country-art.py` - compresses `art/src-c-*.jpg` to `art/country/*.webp` (480x320, tuned to ~20 KB each). `tools/facts.json` - the 36 fun facts.
- `tools/make-itch-assets.py`, `tools/make-cover.py` - build the itch.io screenshots, GIF and cover from the real game.
- `itch/` - the itch.io kit (page text, cover, screenshots, GIF, upload zip).
- `build.mjs` - **legacy** generator of the first version of `index.html`. It needs the original TypeScript sources (`../grok-workspace`), which are not available any more, and it does not know the v2 changes. v2 was edited directly in `index.html`; do not rebuild with it.

## Credits

Map data: [Natural Earth](https://www.naturalearthdata.com/) (public domain). Everything else: see "How AI was used".
