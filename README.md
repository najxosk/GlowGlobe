# Glow Globe

Light up the world, city by city. Visit every city of a country **once**, only along the roads, to make that country glow. Finish every country of a continent to light the continent (with a picture of it glowing at night), finish all six and the whole Earth shines.

Made for **Super Free AI Game Jam #2**.

- **Platform:** browser, touch (phones) and mouse (PC). No install, no server.
- **One file:** everything is inside `index.html` (**~583 KB**; the six continent pictures are embedded as WebP data URLs, ~45-60 KB each). It works fully offline, just open it, or upload it to itch.io as an HTML5 game.
- **Content:** 6 continents, 36 countries/regions, 219 cities. English only.
- **Difficulty:** continents run Europe -> Oceania -> South America -> Africa -> North America -> Asia. Inside each continent the levels get harder (more roads, more dead ends; 8-city levels come last). Every level is checked with a solver. Region cards show a 1-5 star difficulty.
- **Controls:** tap a city to start, then tap a glowing neighbour on the trail end. Undo / Restart / Hint (3 per level) are 46 px buttons. Progress auto-saves to `localStorage` (v1 and v2 saves load).
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
- `tests/verify.mjs` - `node tests/verify.mjs`: data, solver, difficulty curve, save compatibility, no placeholders.
- `tests/e2e.py` - `python3 tests/e2e.py`: Playwright (390x844 touch + 1280x720 mouse) plays levels on several continents, reloads, checks persistence, label overlaps, tap precision, button sizes, credits and console errors. Needs Playwright for Python and Chrome.
- `tools/levels.mjs` - one-time generator used to order the levels and tune the roads (`tools/roads-base.json` = original roads).
- `tools/make-itch-assets.py`, `tools/make-cover.py` - build the itch.io screenshots, GIF and cover from the real game.
- `itch/` - the itch.io kit (page text, cover, screenshots, GIF, upload zip).
- `build.mjs` - **legacy** generator of the first version of `index.html`. It needs the original TypeScript sources (`../grok-workspace`), which are not available any more, and it does not know the v2 changes. v2 was edited directly in `index.html`; do not rebuild with it.

## Credits

Map data: [Natural Earth](https://www.naturalearthdata.com/) (public domain). Everything else: see "How AI was used".
