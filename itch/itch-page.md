# itch.io page kit - Glow Globe

Everything below is ready to paste into the itch.io "Edit game" page.
(Nothing here has been published. Stefan decides when to upload.)

## Title
Glow Globe

## Short description / tagline (max ~100 chars)
Light every city, once, along the roads - and make the whole Earth glow.

## Pitch (1-2 lines for the jam entry)
A calm, one-file map puzzle: tap your way through every city of a country without visiting any twice. Finish a country, light a continent, glow the globe. Works on phones and PC, no install.

## Description (paste into the page body)
**Glow Globe** is a small, cozy route puzzle on a dark night-time map of the world.

Every country is a little puzzle: the cities are connected by dashed roads, and you have to visit **every city exactly once**. Pick a start city, follow the roads, and watch your gold trail light the country up. Take a wrong turn? Undo, or ask for a hint (3 per level).

Finish all the countries of a continent and the whole continent glows - with a picture of it lit up at night and a silly fact. Light all six continents and the entire Earth shines.

**Features**
- 6 continents, 36 countries and regions, 219 cities
- Levels get harder as you go: Europe is a gentle warm-up, Asia ends with tight 8-city routes. Every level is checked with a solver, so each one can be solved
- Satisfying light-up effects, a light wave over your route and a bloom when a country is finished
- Glow Atlas to see how much of the Earth you have lit
- Automatic saving - close the tab and continue later
- Plays great on phones (big touch targets, nearest-city tapping) and on desktop
- One small file, works offline, no ads, no account

## Controls
- **Tap / click a city** to start, then tap a glowing neighbour at the end of your gold trail
- **Undo** - step back one city
- **Restart** - clear the country and start over
- **Hint** - shows a correct next city (3 per country)
- **Menu** - continents, Glow Atlas, sound, credits

## How AI was used
This game was made for **Super Free AI Game Jam #2** and AI is part of every layer:
- **Concept and design:** the idea and the rules were developed together with AI (Grok).
- **Code:** the game (a single HTML file with canvas + Web Audio) was written with AI tools and then tested and directed by a human.
- **Art:** the six continent pictures (glowing night-lights over each continent) were generated with an AI image generator and compressed to ~50 KB each.
- **Text:** the country facts and the silly continent lines were written with AI help.
- **Sound:** not AI-generated and not sampled - every note is synthesised live in the browser with Web Audio.
- **Level checks:** an automated solver verifies that every country can be completed.
The same text is available in the game under Menu -> "How AI made this".

## Credits
- Map data: **Natural Earth** (public domain) - https://www.naturalearthdata.com/ - simplified for speed.
- Made by **Stefan (najxosk)** for Super Free AI Game Jam #2.

## Tags (itch allows up to 10)
Puzzle, Casual, Relaxing, Singleplayer, Short, Touch, Map, Geography, Cute, Mobile  
(if a tag is not offered, drop "Cute"/"Mobile" first; "AI" is useful if the tag list has it.)

## Metadata
- Kind of project: **HTML**
- Genre: **Puzzle**
- Release status: **Released**
- Pricing: **No payments** (free)
- Platforms: **Web (HTML5)** - tick "Mobile friendly" in the HTML options
- Made with: HTML5 / Canvas / Web Audio (AI-assisted)
- Language: English
- AI disclosure ("Generative AI" box on itch): **Yes** - code, concept and art; describe it with the text from the section above.

## Files in this kit
| File | Use |
|---|---|
| `glowglobe-html5.zip` | the upload (contains `index.html` only: ~583 KB unpacked, ~380 KB zipped) |
| `cover.png` | cover image, 630x500 |
| `screenshots/01-mobile-menu.png` ... `06-desktop-china.png` | 6 screenshots (4 mobile 390x844 @2x, 2 desktop 1280x720); itch shows 3-5 well, pick your favourites |
| `gameplay.gif` | ~22 s gameplay GIF, 300 px wide (UK -> Portugal -> Europe glows). Use as a screenshot/GIF on the page |
| `gameplay.webm` | the same recording as video (can be uploaded to YouTube and linked in "Add a video") |

## Upload steps (HTML5 game on itch.io)
1. Log in at itch.io -> **Dashboard** -> **Create new project** (https://itch.io/game/new).
2. **Title:** Glow Globe. **Project URL:** e.g. `glow-globe` (-> najxosk.itch.io/glow-globe).
3. **Short description / tagline:** paste the tagline above.
4. **Classification:** Kind of project = **HTML**. Release status = Released. Genre = Puzzle.
5. **Uploads:** click **Upload files**, choose `itch/glowglobe-html5.zip`. (The zip must have `index.html` at its top level, not inside a folder - this one does.)
6. When the file is listed, tick **"This file will be played in the browser"**.
7. **Embed options** (appear after ticking): 
   - Viewport dimensions: **960 x 600** (any works, the game fills its frame), tick **"Automatically start on page load"** if you like, 
   - tick **"Mobile friendly"** (and keep default orientation: "Portrait" works best, or leave as is since the game adapts), 
   - tick **"Fullscreen button"**, 
   - leave **"Enable scrollbars"** off (the game never scrolls), 
   - tick "Click to launch in fullscreen" for mobile if offered.
8. **Description:** paste the "Description" section, then the "Controls", "How AI was used" and "Credits" sections below it (use itch's markdown/headings).
9. **Cover image:** upload `cover.png` (630x500). **Screenshots:** upload 3-5 from `screenshots/` plus `gameplay.gif` (itch accepts GIFs as screenshots; keep under 3 MB if it complains, the GIF is ~2.8 MB).
10. **Tags:** add the tags above. **Community:** comments on. **Visibility & access:** keep **Draft** until you have played it once on the project page.
11. Press **Save**, open **View page**, test on your phone and PC (title -> Start -> finish one country -> reload page -> Continue).
12. **Submit to the jam:** open the jam page (Super Free AI Game Jam #2), click **Submit your project**, choose Glow Globe, confirm. Deadline: **15 Nov 2026, 02:10 (Europe/Bratislava)**. Then switch the project to **Public** (if it is still a draft).
13. After submitting, play and rate **5-10 other jam entries** (jam rule), so your entry is eligible and gets seen.
14. In the AI disclosure/"Generative AI" field (if the page shows one), say: code, concept and art were made with AI tools - same text as "How AI was used".
