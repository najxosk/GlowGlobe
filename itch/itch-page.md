# itch.io page kit - Glow Globe

Everything below is ready to paste into the itch.io "Edit game" page.
(Nothing here has been published. Stefan decides when to upload.)

**Jam deadline (verified on https://itch.io/jam/super-free-ai-game-jam-2):** submissions close at **2026-11-15 02:10 UTC = 15 Nov 2026, 03:10 in Bratislava (CET, UTC+1)** - i.e. one hour later than the 02:10 noted before (itch lists jam times in UTC; the page shows 14 Nov 9:10 PM in New York). **Recommendation: submit on Saturday 14 Nov in the evening (around 20:00 Bratislava time), not at the last minute.**

## Title
Glow Globe

## Short description / tagline (max ~100 chars)
A logic puzzle on the night-time map: one start, one goal, one perfect route through every city.

## How to play (put this right under the tagline on the page)
- Start at the glowing power plant, light every city exactly once, and finish at the star city.
- Tap a connected city to move. Undo steps back one city (hold it to restart the level).
- Every level has exactly one solution. You can find it by logic, with no guessing.

Best played in portrait on phones. Progress is saved automatically in your browser.

## Pitch (1-2 lines for the jam entry)
Every country is a logic puzzle with exactly ONE solution, verified by a solver. Learn a new rule on each continent: number clues, one-way roads, order arrows. Then combine them in Asia. Plays on phone and PC, no install.

## Description (paste into the page body)
**Glow Globe** is a logic puzzle on a dark night-time map of the world.

Every country is a puzzle: light **every city exactly once**, start at the glowing **power plant** and finish at the **star city**. There is **exactly one** correct route, and every level was verified by a solver. No guessing needed - you can work it out by deduction. Whichever continent you start on, a short intro explains the goal and that continent's rules the first time. Each continent teaches its rule on small levels first, and later levels mix at most two rules before Asia:

1. **Europe - start, goal, one route.** The basics: only one route works.
2. **Oceania - number clues.** A number on a city is its place in your route. A city marked 3 must be the 3rd you light.
3. **South America - one-way roads (plus a few number clues).** Arrows show the only direction you may travel.
4. **Africa - order arrows.** A purple dotted arrow A -> B means: light A before B.
5. **North America - a gentle mix.** Number clues, one-way roads and order arrows, two at a time.
6. **Asia - rules mixed.** Two rules per level at first, three at the end - the hardest puzzles, still one solution each.

Stuck? A clear **Dead end!** message shakes the screen and the **Undo** button pulses. Undo is the only control you need while playing: tap it to step back one city, hold it for a moment to restart the level (a restart counts as one undo for your stars). Earn up to **3 stars per level**: solved with no undo = 3 stars, 1-3 undos = 2, more = 1. Replay any level for the full 3.

Finish a country and it glows with **its own AI-made night scene** - Big Ben, the Taj Mahal, Machu Picchu, the Pyramids and 32 more - plus a **fun fact** that is true and a little silly. Finish all the countries of a continent and the whole continent glows. Light all six continents and the entire Earth shines.

**Features**
- 6 continents, 36 levels (6 / 7 / 6 / 6 / 5 / 6), 6-9 cities each, a gentle start for every new rule and difficulty rising inside every continent
- Every level has exactly one solution (checked by two independent solvers in the test suite)
- Clear glowing roads (dark outline, bright body, gold pulse on the roads you can take next) that curve around cities instead of hiding behind them
- A short intro on every continent (goal + a drawn example of each rule), shown the first time you enter it - start anywhere you like - and a "?" button to read the rules again
- 36 AI-generated country scenes (one per level, shown when you finish a country, plus thumbnails in the list) and 36 fun facts
- Stars, a Glow Atlas, automatic saving (close the tab and continue later)
- Satisfying light-up effects, a light wave over your route and a bloom when a country is finished
- Plays great on phones (big touch targets, forgiving tapping; best in portrait) and on desktop
- One small file, works offline, no ads, no account

## Controls
- **Tap / click a city** that is connected to the end of your gold trail (legal moves glow; the power plant is already lit)
- **Undo** - the only control you need while playing: tap = step back one city (it pulses when you are in a dead end), hold for 0.6 s = restart the level. Each undo, and each restart (which counts as one undo), costs a bit of your stars (see above)
- **?** - the rules of this level
- **Menu** - continents, Glow Atlas, sound, credits

## How AI was used
This game was made for **Super Free AI Game Jam #2**, and AI is part of every layer. Same text as in the game (Menu -> "How AI made this"):
- **Design & code:** the game design, all of the code (one HTML file with canvas + Web Audio) and the puzzle generator were made with AI (Grok).
- **Puzzles:** a generator and an exhaustive solver, both written with AI, built every level and checked that it has exactly one solution and uses its rules.
- **Images:** the six continent pictures and the 36 country scenes (one glowing landmark or landscape per country, no text and no people) were generated with an AI image generator and then compressed (480x320 WebP, ~20 KB each) so everything fits in one file.
- **Words:** the fun fact for every country and the silly continent lines were written with AI help. The facts are well-known ones, picked so that you can check them.
- **The human:** Stefan directed the project, playtested every version and picked the images.
- **Sound:** synthesized in the browser (Web Audio), no samples. **Map:** Natural Earth (public domain).

## Credits
- Sound: synthesized in the browser. Map: **Natural Earth** (public domain) - https://www.naturalearthdata.com/ - simplified for speed. Everything else: see "How AI was used" above.
- Made by **Stefan (najxosk)** for Super Free AI Game Jam #2.

## Tags (itch allows up to 10)
Puzzle, Logic, Casual, Relaxing, Singleplayer, Short, Geography, Touch-Friendly, Atmospheric, AI  
(if "AI" or "Touch-Friendly" is not offered, drop it or use "Mobile"/"Touch" instead.)

## Metadata
- Kind of project: **HTML**
- Genre: **Puzzle**
- Release status: **Released**
- Pricing: **No payments** (free)
- Platforms: **Web (HTML5)** - tick "Mobile friendly" in the HTML options
- Made with: HTML5 / Canvas / Web Audio (AI-assisted)
- Language: English
- AI disclosure ("Generative AI" box on itch): **Yes** - code, concept and art; describe it with the text of "How AI was used" above (design, code and puzzle generator: Grok; images: AI image generator; human: direction, playtesting, picking the images).

## Files in this kit
| File | Use |
|---|---|
| `glowglobe-html5.zip` | the upload (contains `index.html` only: ~1.6 MB unpacked, ~1.2 MB zipped) |
| `cover.png` | cover image, 630x500 |
| `screenshots/01-mobile-menu.png` ... `16-mobile-intro-africa-first.png` | 16 screenshots: 13 mobile (390x844 @2x: menu, continent intros (Europe, Oceania, Africa), number clues, one-way roads, order arrows, North America mix, dead end, Asia with all rules, two country-complete cards, continent glow) and 3 desktop (1280x720). itch shows 3-5 well: upload **screenshots 05, 06, 09, 10, 11** (one-way roads, order arrows, Asia, France card, Japan card) in that order |
| `gameplay.mp4` | **main video** (H.264, 480x1000, ~32 s: Europe intro -> UK -> country card -> Oceania intro + number clues -> Ecuador one-way roads). Upload to YouTube and link it in "Add a video", or use it directly |
| `gameplay.webm` | the same video as compact VP9 |
| `gameplay.gif` | smaller GIF teaser, 480 px wide, first 20 s of the video (~2.3 MB) |

## Upload steps (HTML5 game on itch.io)
1. Log in at itch.io -> **Dashboard** -> **Create new project** (https://itch.io/game/new).
2. **Title:** Glow Globe. **Project URL:** e.g. `glow-globe` (-> najxosk.itch.io/glow-globe).
3. **Short description / tagline:** paste the tagline above.
4. **Classification:** Kind of project = **HTML**. Release status = Released. Genre = Puzzle.
5. **Uploads:** click **Upload files**, choose `itch/glowglobe-html5.zip`. (The zip must have `index.html` at its top level, not inside a folder - this one does.)
6. When the file is listed, tick **"This file will be played in the browser"**.
7. **Embed options** (appear after ticking):
   - Viewport dimensions: **480 x 854** (portrait; the game fills its frame and adapts to any size - on small laptop screens 480 x 720 also works),
   - tick **"Mobile friendly"** and set orientation to **Portrait**,
   - tick **"Fullscreen button"** (and "Click to launch in fullscreen" for mobile if offered),
   - leave **"Enable scrollbars"** off (the game never scrolls),
   - "Automatically start on page load": optional (the game starts on its title screen either way).
8. **Description:** paste the "Description" section, then the "Controls", "How AI was used" and "Credits" sections below it (use itch's markdown/headings).
9. **Cover image:** upload `cover.png` (630x500). **Screenshots:** upload screenshots 05, 06, 09, 10, 11 from `screenshots/` plus `gameplay.gif` (itch accepts GIFs as screenshots; the GIF is ~2.3 MB, under itch's 3 MB limit). Add the video (`gameplay.mp4` via YouTube) under "Add a video".
10. **Tags:** add the tags above. **Community:** comments on. **Visibility & access:** keep **Draft** until you have played it once on the project page.
11. Press **Save**, open **View page**, test on your phone and PC (title -> Start -> finish one country -> reload page -> Continue).
12. **Submit to the jam:** open the jam page (Super Free AI Game Jam #2), click **Submit your project**, choose Glow Globe, confirm. Deadline: **15 Nov 2026, 03:10 Bratislava time (= 02:10 UTC)** - submit on **14 Nov in the evening** to be safe. Then switch the project to **Public** (if it is still a draft).
13. After submitting, play and rate **5-10 other jam entries** (jam rule), so your entry is eligible and gets seen.
14. In the AI disclosure/"Generative AI" field (if the page shows one), say: design, code and art were made with AI tools (Grok for design/code/generator, an AI image generator for the pictures) and directed, playtested and curated by Stefan - same text as "How AI was used".
