# itch.io page kit - Glow Globe

Everything below is ready to paste into the itch.io "Edit game" page.
(Nothing here has been published. Stefan decides when to upload.)

## Title
Glow Globe

## Short description / tagline (max ~100 chars)
A logic puzzle on the night-time map: one start, one goal, one perfect route through every city.

## Pitch (1-2 lines for the jam entry)
Every country is a hand-checked logic puzzle with exactly ONE solution. Learn a new rule on each continent - number clues, one-way roads, order arrows - then mix them in Asia. Phones and PC, one file, no install.

## Description (paste into the page body)
**Glow Globe** is a logic puzzle on a dark night-time map of the world.

Every country is a puzzle: light **every city exactly once**, start at the glowing **power plant** and finish at the **star city**. There is **exactly one** correct route, and every level was verified by a solver. No guessing needed - you can work it out by deduction. Whichever continent you start on, a short intro explains the goal and that continent's rules the first time. Each continent teaches its rule on small levels first, and later levels mix at most two rules before Asia:

1. **Europe - start, goal, one route.** The basics: only one route works.
2. **Oceania - number clues.** A number on a city is its place in your route. A city marked 3 must be the 3rd you light.
3. **South America - one-way roads.** Arrows show the only direction you may travel.
4. **Africa - order arrows.** A purple dotted arrow A -> B means: light A before B.
5. **North America - a gentle mix.** Number clues, one-way roads and order arrows, two at a time.
6. **Asia - rules mixed.** Two rules per level at first, three at the end - the hardest puzzles, still one solution each.

Stuck? A clear **Dead end!** message shakes the screen and the **Undo** button pulses. Undo is the only control you need: tap it to step back one city, hold it for a moment to restart the level. Earn up to **3 stars per level**: solved with no undo = 3 stars, 1-3 undos = 2, more = 1. Replay any level for the full 3.

Finish a country and it glows with **its own AI-made night scene** - Big Ben, the Taj Mahal, Machu Picchu, the Pyramids and 32 more - plus a **fun fact** that is true and a little silly. Finish all the countries of a continent and the whole continent glows. Light all six continents and the entire Earth shines.

**Features**
- 6 continents, 36 levels (6 / 7 / 6 / 6 / 5 / 6), 6-9 cities each, a gentle start for every new rule and difficulty rising inside every continent
- Every level has exactly one solution (checked by two independent solvers in the test suite)
- Clear glowing roads (dark outline, bright body, gold pulse on the roads you can take next) that curve around cities instead of hiding behind them
- A short intro on every continent (goal + a drawn example of each rule), shown the first time you enter it - start anywhere you like - and a "?" button to read the rules again
- 36 AI-generated country scenes (one per level, shown when you finish a country, plus thumbnails in the list) and 36 fun facts
- Stars, a Glow Atlas, automatic saving (close the tab and continue later)
- Satisfying light-up effects, a light wave over your route and a bloom when a country is finished
- Plays great on phones (big touch targets, nearest-city tapping) and on desktop
- One small file, works offline, no ads, no account

## Controls
- **Tap / click a city** that is connected to the end of your gold trail (legal moves glow; the power plant is already lit)
- **Undo** - the only button: tap = step back one city (it pulses when you are in a dead end), hold for 0.6 s = restart the level. Each use costs a bit of your stars (see above)
- **?** - the rules of this level
- **Menu** - continents, Glow Atlas, sound, credits

## How AI was used
This game was made for **Super Free AI Game Jam #2** and AI is part of every layer:
- **Concept and design:** the idea and the rules were developed together with AI (Grok).
- **Code:** the game (a single HTML file with canvas + Web Audio) was written with AI tools and then tested and directed by a human.
- **Art:** the six continent pictures (glowing night-lights over each continent) and the 36 country scenes (one glowing landmark or landscape per country, no text and no people) were generated with an AI image generator, then compressed to 480x320 WebP (~20 KB each) so everything fits in one file.
- **Text:** the fun fact for every country and the silly continent lines were written with AI help; the facts are well-known ones, chosen so that you can check them.
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
| `glowglobe-html5.zip` | the upload (contains `index.html` only: ~1.6 MB unpacked, ~1.2 MB zipped) |
| `cover.png` | cover image, 630x500 |
| `screenshots/01-mobile-menu.png` ... `15-desktop-country-card-india.png` | 16 screenshots: 13 mobile (390x844 @2x: menu, continent intros (Europe, Oceania, Africa), number clues, one-way roads, order arrows, North America mix, dead end, Asia with all rules, two country-complete cards, continent glow) and 3 desktop (1280x720). itch shows 3-5 well, pick your favourites (suggested: 05, 06, 09, 10, 11) |
| `gameplay.gif` | ~30 s gameplay GIF, 250 px wide (Europe intro -> UK -> country card -> Tasmania number clues -> Ecuador one-way roads) |
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
9. **Cover image:** upload `cover.png` (630x500). **Screenshots:** upload 3-5 from `screenshots/` plus `gameplay.gif` (itch accepts GIFs as screenshots; keep under 3 MB if it complains, the GIF is ~2.3 MB).
10. **Tags:** add the tags above. **Community:** comments on. **Visibility & access:** keep **Draft** until you have played it once on the project page.
11. Press **Save**, open **View page**, test on your phone and PC (title -> Start -> finish one country -> reload page -> Continue).
12. **Submit to the jam:** open the jam page (Super Free AI Game Jam #2), click **Submit your project**, choose Glow Globe, confirm. Deadline: **15 Nov 2026, 02:10 (Europe/Bratislava)**. Then switch the project to **Public** (if it is still a draft).
13. After submitting, play and rate **5-10 other jam entries** (jam rule), so your entry is eligible and gets seen.
14. In the AI disclosure/"Generative AI" field (if the page shows one), say: code, concept and art were made with AI tools - same text as "How AI was used".
