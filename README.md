# Glow Globe

Light up the world, city by city. Tap every city in a region to complete it, complete every region in a continent to make the whole continent glow — then cross it off with a smirk. Finish all six continents and the entire world shines.

- **Platform:** browser (desktop + mobile touch), no install
- **Single file:** everything lives in `index.html` (~81 KB) — works fully offline, just double-click it or drop it on itch.io
- **Map data:** Natural Earth, public domain (Douglas–Peucker simplified)

## Play

Open `index.html` directly in any modern browser. Progress auto-saves to `localStorage`.

## Project structure

- `build.mjs` — build generator. Reads the original TypeScript sources, strips types, simplifies the land/region polygons (Douglas–Peucker), and bundles one self-contained `index.html` with all data, shapes, audio and game logic inline.
- `index.html` — the finished, standalone game. **This is the deliverable.**

## Rebuild

```
GGW_SRC="C:/path/to/source" GGW_OUT="C:/output/index.html" node build.mjs
```

Defaults: source under `../grok-workspace`, output `index.html` in this folder.

## Credits

Built from a Grok-generated game concept. Gameplay hook (rising melody + constellation lines as you light cities, full-continent lighting animation, funny continent-completion blurbs, save & resume, world-light percentage) rebuilt into the single-file build.
