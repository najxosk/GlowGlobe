# itch.io page kit - Glow Globe

Everything below is ready to paste into the itch.io "Edit game" page.
(Nothing here has been published. Stefan decides when to upload.)

## Title
Glow Globe

## Short description / tagline (max ~100 chars)
A logic puzzle on the night-time map: one start, one goal, one perfect route through every city.

## Pitch (1-2 lines for the jam entry)
Every country is a hand-checked logic puzzle with exactly ONE solution. Learn a new rule on each continent - number clues, one-way roads, locked gates, fragile bridges - then combine them all in Asia. Phones and PC, one file, no install.

## Description (paste into the page body)
**Glow Globe** is a logic puzzle on a dark night-time map of the world.

Every country is a puzzle: light **every city exactly once**, start at the glowing **power plant** and finish at the **star city**. There is **exactly one** correct route, and every level was verified by a solver. No guessing needed - you can work it out by deduction. Each continent adds one new rule and keeps the old ones:

1. **Europe - start, goal, one route.** The basics: only one route works.
2. **Oceania - number clues.** A number on a city is its place in your route. A city marked 3 must be the 3rd you light.
3. **South America - one-way roads.** Arrows show the only direction you may travel.
4. **Africa - locked gates.** A coloured road is closed until you light the city with the matching key.
5. **North America - fragile bridges and order arrows.** Dashed bridges collapse: the moment you cross one, ALL dashed bridges collapse - use at most one. A purple arrow A -> B means light A before B.
6. **Asia - everything at once.** The hardest puzzles, mixing all rules.

Stuck? A clear **Dead end!** message shakes the screen and Undo pulses. Ask for a **Hint** (it shows the next correct city and costs a star). Earn up to **3 stars per level**: no hints = 3 stars, one hint = 2, more = 1. Replay any level for the full 3.

Finish all the countries of a continent and the whole continent glows - with a picture of it lit up at night and a silly fact. Light all six continents and the entire Earth shines.

**Features**
- 6 continents, 36 levels (6 / 7 / 6 / 6 / 5 / 6), 6-10 cities each, difficulty rising inside every continent
- Every level has exactly one solution (checked by two independent solvers in the test suite)
- Rule cards with a tiny example before each new rule, and a "?" button to read the rules again
- Stars, a Glow Atlas, automatic saving (close the tab and continue later)
- Satisfying light-up effects, a light wave over your route and a bloom when a country is finished
- Plays great on phones (big touch targets, nearest-city tapping) and on desktop
- One small file, works offline, no ads, no account

## Controls
- **Tap / click a city** that is connected to the end of your gold trail (legal moves glow; the power plant is already lit)
- **Undo** - step back one city (it pulses when you are in a dead end)
- **Restart** - clear the country and start over
- **Hint** - shows the next correct city and costs a star (3 per level)
- **?** - the rules of this level
- **Menu** - continents, Glow Atlas, sound, credits

## How AI was used
This game was made for **Super Free AI Game Jam #2** and AI is part of every layer:
- **Concept and design:** the idea and the rules were developed together with AI (Grok).
- **Code:** the game (a single HTML file with canvas + Web Audio) was written with AI tools and then tested and directed by a human.
- **Art:** the six continent pictures (glowing night-lights over each continent) were generated with an AI image generator and compressed to ~50 KB each.
- **Text:** the country facts and the silly continent lines were written with AI help.
- **Sound:** not AI-generated and not sampled - every note is synthesised live in the browser with Web Audio.
- **Puzzle design:** a generator and an exhaustive solver built every level so that it has exactly ONE solution and every rule is respected; the roads and clues were pruned until the puzzle was unique.
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
| `glowglobe-html5.zip` | the upload (contains `index.html` only: ~630 KB unpacked, ~400 KB zipped) |
| `cover.png` | cover image, 630x500 |
| `screenshots/01-mobile-menu.png` ... `12-desktop-india.png` | 12 screenshots: 10 mobile (390x844 @2x: menu, rule cards, number clues, one-way roads, gates, fragile bridges, dead end, Asia with all rules, continent glow) and 2 desktop (1280x720). itch shows 3-5 well, pick your favourites (suggested: 04, 05, 06, 09, 10) |
| `gameplay.gif` | ~30 s gameplay GIF, 270 px wide (rule card -> UK -> Tasmania number clues -> Ecuador one-way roads) |
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
