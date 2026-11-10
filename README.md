# Glow Globe

A logic puzzle on a night-time map of the world. In every country, light **every city exactly once**, starting at the power plant and ending at the star goal. Every level has **exactly one solution**. Each continent adds a new rule. Finish every country of a continent to light the continent (with a picture of it glowing at night and a silly fact).

Made for **Super Free AI Game Jam #2**.

- **Platform:** browser, touch (phones) and mouse (PC). No install, no server.
- **One file:** everything is inside `index.html` (**~630 KB**; the six continent pictures are embedded as WebP data URLs). It works fully offline, just open it, or upload it to itch.io.
- **Content:** 6 continents, 36 levels (Europe 6, Oceania 7, South America 6, Africa 6, North America 5, Asia 6), 275 cities, 6-10 cities per level. English only.
- **Rules, one new rule per continent (older rules stay on):** Europe - start (power plant), goal (star) and ONE solution; Oceania - number clues (the city must be the Nth lit); South America - one-way roads; Africa - locked gates (coloured road opens when the key city of that colour is lit); North America - fragile bridges (dashed; crossing one collapses ALL dashed bridges, so at most one can be used) and order arrows (A before B); Asia - all rules mixed, hardest.
- **Scoring and help:** 3 stars per level (no hint 3, one hint 2, more 1; replay for 3). Hint = next city of the unique solution and costs a star. Dead ends show a message, shake, and the Undo button pulses. Progress auto-saves to `localStorage` (v1/v2 saves are migrated: finished regions are kept, stars/progress reset).
- **Juice:** ring + glow pop on every city, light wave over the route and a bloom when a country is finished, rising pentatonic notes, vibration on phones.

## How AI was used (also shown in the game, menu -> "How AI made this")

- Concept, game design and all code: made with AI tools (Grok), directed and tested by a human.
- The six continent pictures: generated with an AI image generator (prompt: glowing night-lights over the continent), then compressed.
- Country facts and continent jokes: written with AI help.
- Sound: synthesised live with Web Audio, no samples.
- Map data: Natural Earth (public domain), simplified (Douglas-Peucker).

Made by Stefan (najxosk).

## Project structure

- `index.html` - the finished game. **This is the deliverable and the source of truth for v2.**
- `art/*.webp` - the compressed continent pictures that are embedded in `index.html` (`CONT_IMG`). The full-size originals (`art/src-*.jpg`) are not tracked.
- `tests/verify.mjs` - `node tests/verify.mjs`: an independent brute-force solver proves every level has exactly one solution and agrees with the in-game rule engine; rule placement per continent, difficulty curve, rule unit tests, save migration, no placeholders.
- `tests/e2e.py` - `python3 tests/e2e.py`: Playwright (390x844 touch + 1280x720 mouse) solves the first two levels of every continent with real taps, checks rule cards, illegal-move messages, dead end + Undo, hint -> star cost, persistence, v2-save migration, label overlaps, tap precision, button sizes and the console.
- `tools/gen-puzzles.mjs` - the level generator: builds a hidden route, places rules consistently, adds decoy roads and prunes clues while the solution stays unique, measures hardness and orders the levels. Writes `DATA` and `PUZ` into `index.html` (`node tools/gen-puzzles.mjs`, ~45 s; `SEED=n` changes the random seed). `tools/data-base.json` holds the base cities and facts.
- `tools/make-itch-assets.py`, `tools/make-cover.py` - build the itch.io screenshots, GIF and cover from the real game.
- `itch/` - the itch.io kit (page text, cover, screenshots, GIF, upload zip).
- `build.mjs` - **legacy** generator of the first version of `index.html`. It needs the original TypeScript sources (`../grok-workspace`), which are not available any more, and it does not know the v2 changes. v2 was edited directly in `index.html`; do not rebuild with it.

## Credits

Map data: [Natural Earth](https://www.naturalearthdata.com/) (public domain). Everything else: see "How AI was used".
