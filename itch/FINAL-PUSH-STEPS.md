# Final push to najxosk/GlowGlobe - NOT executed yet (wait for Stefan's "ano")

`/workspace/GlowGlobe-v2` already has `origin = https://github.com/najxosk/GlowGlobe.git`, branch `main`.
Local `main` is a straight continuation of `origin/main` (fast-forward, 0 commits behind), so no history rewrite is needed.
`index.html` and `README.md` are already updated and committed here; the push also carries the tests, tools and the itch kit.
GitHub Pages of that repo serves `main` from the root: https://najxosk.github.io/GlowGlobe/

1. `cd /workspace/GlowGlobe-v2 && git status --short` -> must be empty (everything committed).
2. `git fetch origin && git rev-list --left-right --count origin/main...HEAD` -> must print `0 <N>` (0 = nothing new on GitHub). If the first number is not 0, STOP and ask.
3. `node tests/verify.mjs` -> ALL CHECKS PASSED (and `python3 tests/e2e.py` -> ALL PASSED if anything changed since the last run).
4. `cmp index.html /workspace/najxosk.github.io/test/glowglobe/index.html` -> identical to the tested live test page.
5. `git push origin main`   (plain push; NO `--force`, no rebase, no amend).
6. Wait ~1 minute, then `curl -sL "https://najxosk.github.io/GlowGlobe/index.html?$RANDOM" | wc -c` must equal `stat -c %s index.html`.
   If Pages hangs: `git commit --allow-empty -m "Retrigger Pages" && git push origin main`.
7. itch: separate step, only after Stefan says so: upload `itch/glowglobe-html5.zip`, follow `itch/itch-page.md` (screenshots 05, 06, 09, 10, 11, cover, video), submit on 14 Nov in the evening (deadline 15 Nov 03:10 Bratislava = 02:10 UTC).
