// Static + logic checks for Glow Globe (no browser needed).  Usage: node tests/verify.mjs
// The browser/gameplay tests live in tests/e2e.py (Playwright).
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(file, "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error("no <script> found in index.html"); process.exit(1); }
const js = m[1];
let fails = 0;
const ok = (cond, label) => { console.log((cond ? "PASS" : "FAIL") + "  " + label); if (!cond) fails++; };

// ---- load the data + save code (everything before the audio section) in a sandbox with a fake DOM
const store = {};
const ctxStub = new Proxy({}, { get: (o, p) => (p in o ? o[p] : () => ({ addColorStop() {} })), set: (o, p, v) => { o[p] = v; return true; } });
const sandbox = {
  document: { querySelector: () => ({ getContext: () => ctxStub, style: {}, addEventListener() {} }) },
  window: {}, innerWidth: 390, innerHeight: 844, devicePixelRatio: 1, addEventListener() {},
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  console, Math, JSON, Set, Array, Object, Date,
};
vm.createContext(sandbox);
vm.runInContext(js.slice(0, js.indexOf("/* ---- audio ---- */")), sandbox);
vm.runInContext(js.slice(js.indexOf("var FUNNY="), js.indexOf("function svgNode")), sandbox); // FUNNY, CONT_EDU, CONT_IMG, RULE_TXT
const run = c => vm.runInContext(c, sandbox);

// ---- file facts
const plain = html.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+\/=]+/g, "");
const kb = Math.round(Buffer.byteLength(html) / 1024);
console.log(`  index.html is ${kb} KB`);
ok(!/<script[^>]+src=|<link[^>]+href=["']https?:|@import/i.test(html), "no external scripts / styles (works offline)");
ok(!/electric ghost|the spark|\bspark\b/i.test(html), "no Electric Ghost / The Spark / 'spark' wording");
{ const area = r => { let a = 0; for (let j = 0; j < r.length; j++) { const p = r[j], q = r[(j + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
  const ln = k => JSON.parse(html.split("\n").find(l => l.startsWith(k)).slice(k.length).replace(/;\s*$/, ""));
  const rg = ln("var RINGS = "), land = ln("var LAND = "); let deg = 0;
  Object.values(rg).forEach(rs => rs.forEach(r => { if (new Set(r.map(p => p.join())).size < 4 || area(r) <= 0.0005) deg++; }));
  land.forEach(r => { if (new Set(r.map(p => p.join())).size < 4 || area(r) <= 0.0005) deg++; });
  ok(deg === 0, "no degenerate map rings (they were drawn as stray line segments, e.g. next to Port Lincoln); found " + deg); }
ok(!/coming soon/i.test(plain), "no 'coming soon' placeholder text");
ok(/rel="icon"/.test(html), "inline favicon");
ok(!/\bFUNNY_ICON\b|lonelyId/.test(html), "unfinished lonelyId / emoji icon placeholders are gone");

// ---- data
const D = run("DATA"), PUZ = run("PUZ");
ok(D.length === 6, "6 continents");
const regs = D.flatMap(c => c.regions);
ok(regs.length === 36, "36 regions");
ok(D[0].id === "europe" && D[0].regions[0].id === "uk", "campaign starts Europe / United Kingdom");
ok(D.map(c => c.id).join() === "europe,oceania,south-america,africa,north-america,asia", "continent order: Europe, Oceania, South America, Africa, North America, Asia");
ok(regs.every(r => r.cities.length >= 6 && r.cities.length <= 10), "every level has 6-10 cities");
console.log("  levels per continent: " + D.map(c => c.id + "=" + c.regions.length).join(" "));
const IMG = run("CONT_IMG");
ok(D.every(c => /^data:image\/(webp|jpeg|png);base64,/.test(IMG[c.id] || "") && IMG[c.id].length > 30000), "CONT_IMG has an embedded picture for all 6 continents");
ok(D.every(c => run("FUNNY")[c.id] && run("CONT_EDU")[c.id]), "continent blurbs + facts present");
const RT = run("RULE_TXT");
ok(["basic", "num", "one", "ord"].every(k => RT[k] && RT[k][0] && RT[k][1].length > 20) && Object.keys(RT).length === 4, "rule texts for exactly 4 rules: goal, numbers, one-way, order (no gates / fragile bridges)");
ok(/lightning power plant/.test(RT.basic[1]) && /every city exactly once/.test(RT.basic[1]) && /along the roads/.test(RT.basic[1]) && /star/.test(RT.basic[1]), "the goal text explains: start at the lightning power plant, every city exactly once, along the roads, end at the star");

// ---- REGRESSION: continent message only when the LAST country of the continent is finished; Next stays in the continent
{
  const cc = js.slice(js.indexOf("function completeRegion"), js.indexOf("function undoCity"));
  ok(/wasAll=contR\.every\(isDone\)/.test(cc) && /var cd=nowAll&&!wasAll/.test(cc) && /var wd=cd&&/.test(cc), "completeRegion: continent/world flags are true only if this level finished the continent (wasAll before, nowAll after)");
  const heroCalls = (js.match(/enterContinentHero\(/g) || []).length;
  ok(heroCalls === 2, "enterContinentHero is defined once and called from exactly one place (nextFromCard, behind the cd flag) - got " + heroCalls);
  const nf = js.slice(js.indexOf("function nextFromCard"), js.indexOf("var FUNNY="));
  ok(/if\(c\.cd\)\{enterContinentHero/.test(nf) && /if\(c\.nx\)\{/.test(nf) && !/regions\[i\+1\]/.test(nf), "nextFromCard: hero only for cd; otherwise the next unfinished country of the same continent or the country list");
  ok(/function nextOpenIn\(cont,rid\)/.test(js), "nextOpenIn(): next unfinished country in the same continent");
}
vm.runInContext(js.slice(js.indexOf("function nextOpenIn"), js.indexOf("function regionCard")), sandbox);
vm.runInContext(js.slice(js.indexOf("function firstOpenRegion"), js.indexOf("function enterTitle")), sandbox);
{ // simulate the Next-button logic with the real functions on a fake save
  run("S={save:fresh()};");
  const eu = D[0].regions.map(r => r.id);
  run("S.contId='europe';");
  for (let k = 0; k < eu.length; k++) {
    run(`S.save.doneRegions.push('${eu[k]}')`);
  }
  run("S.save=fresh();");
  const order = [];
  for (let k = 0; k < eu.length; k++) { run(`S.save.doneRegions.push('${eu[k]}')`); order.push(run(`nextOpenIn(findContinent('europe'),'${eu[k]}')`)); }
  ok(order.slice(0, 5).join() === eu.slice(1).join() && order[5] === null, "Next goes uk -> pt -> fr -> it -> de -> es within Europe; after the last country there is nothing left (-> continent message)");
  // replaying UK when Europe is already finished: next unfinished = none (no continent message)
  ok(run("nextOpenIn(findContinent('europe'),'uk')") === null, "replaying a country of a finished continent: no 'next' (goes back to the list)");
  // replay UK with only UK+PT+FR done -> next is IT (skips finished ones)
  run("S.save=fresh();S.save.doneRegions=['uk','pt','fr'];");
  ok(run("nextOpenIn(findContinent('europe'),'uk')") === "it", "replaying a country: next = the first unfinished country of the same continent");
}
// v3/v4 saves with the whole of Europe done must keep Europe done but never auto-jump while a country is being replayed
store[run("SAVE_KEY")] = JSON.stringify({ v: 4, sound: true, tutorial: 1, undos: {}, stars: {}, seen: {}, currentContinent: "europe", currentRegion: "uk", partial: {}, doneRegions: ["uk", "pt", "fr", "it", "de", "es"], doneContinents: ["europe"] });
ok(run("load().doneContinents.join()") === "europe" && run("load().doneRegions.length") === 6, "v4 save with finished Europe stays finished");
// continent texts
for (const c of D) {
  const t = [c.blurb, run("FUNNY")[c.id], run("CONT_EDU")[c.id]];
  ok(t.every(x => x && x.length > 40 || x === run("FUNNY")[c.id]) && !/lit first|lights the way|billion lights|bright north|heart of light|light that dances/i.test(t.join(" ")) && run("CONT_EDU")[c.id].length > 90, `continent text for ${c.id} is a real fact (not the old filler)`);
}
ok(/Eurasia/.test(run("CONT_EDU").europe) && /Ural/.test(run("CONT_EDU").europe), "Europe text: Eurasia / Ural border fact");
ok(!/\bnx\.id\b/.test(js.slice(js.indexOf("function nextFromCard"), js.indexOf("var FUNNY="))), "no stale 'nx.id' code in nextFromCard");

// ---- an INDEPENDENT solver, written straight from the rule text (does not use puzSolve / puzCheck)
function routeValid(pz, route) {
  const n = pz.c.length;
  if (route.length !== n || new Set(route).size !== n) return false;
  if (route[0] !== pz.s || route[n - 1] !== pz.g) return false;
  for (let i = 1; i < n; i++) {
    const a = route[i - 1], b = route[i];
    const road = pz.r.find(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
    if (!road) return false;
    const t = road[2] || 0;
    if (t === 1 && !(road[0] === a && road[1] === b)) return false;
    if (t > 1) return false; // only plain and one-way roads exist
  }
  for (const [c, N] of Object.entries(pz.n)) if (route.indexOf(c) !== N - 1) return false;
  for (const [a, b] of (pz.o || [])) if (route.indexOf(a) > route.indexOf(b)) return false;
  return true;
}
function bruteSolutions(pz) {   // plain Hamiltonian-path enumeration, rules checked only on finished routes
  const adj = {}; pz.c.forEach(c => adj[c] = []);
  for (const e of pz.r) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); }
  const out = [], path = [pz.s], seen = new Set([pz.s]);
  (function dfs() {
    if (path.length === pz.c.length) { if (routeValid(pz, path)) out.push(path.slice()); return; }
    for (const x of adj[path[path.length - 1]]) if (!seen.has(x)) { seen.add(x); path.push(x); dfs(); path.pop(); seen.delete(x); }
  })();
  return out;
}

const effort = {}; let allUnique = true, allAgree = true, storedOk = true, structOk = true;
const typeCount = { 0: 0, 1: 0, 2: 0, 3: 0 }, rowInfo = [];
for (const c of D) for (const r of c.regions) {
  const pz = PUZ[r.id]; const ids = r.cities.map(x => x.id);
  if (!pz) { structOk = false; console.log("  missing PUZ", r.id); continue; }
  const sameCities = pz.c.length === ids.length && ids.every(i => pz.c.includes(i));
  const roadsOk = pz.r.every(e => pz.c.includes(e[0]) && pz.c.includes(e[1]) && e[0] !== e[1]) && new Set(pz.r.map(e => [e[0], e[1]].sort().join("|"))).size === pz.r.length;
  const cluesOk = Object.keys(pz.n).every(id => pz.c.includes(id) && id !== pz.s && pz.n[id] >= 2 && pz.n[id] <= pz.c.length)
    && new Set(Object.values(pz.n)).size === Object.keys(pz.n).length && !(pz.n[pz.g] !== undefined && pz.n[pz.g] !== pz.c.length);
  if (!sameCities || !roadsOk || !cluesOk || pz.s === pz.g || !pz.c.includes(pz.s) || !pz.c.includes(pz.g)) { structOk = false; console.log("  bad structure", r.id); }
  const mine = bruteSolutions(pz);
  const eng = vm.runInContext("puzSolve", sandbox)(pz, 50);
  if (mine.length !== 1) { allUnique = false; console.log("  NOT UNIQUE (independent solver):", r.id, mine.length); }
  if (eng.count !== mine.length) { allAgree = false; console.log("  solvers disagree:", r.id, eng.count, mine.length); }
  if (!(mine.length === 1 && pz.sol.join() === mine[0].join() && routeValid(pz, pz.sol))) { storedOk = false; console.log("  stored solution wrong:", r.id); }
  effort[r.id] = eng.nodes + 3 * eng.dead;
  for (const e of pz.r) typeCount[e[2] || 0]++;
  rowInfo.push(`${r.id}:${ids.length}c/${pz.r.length}r/H${effort[r.id]}`);
}
ok(structOk, "puzzle data is well-formed (cities match, roads valid, clues valid, start != goal)");
ok(allUnique, "EVERY level has exactly one solution (independent brute-force solver)");
ok(allAgree, "the game's rule engine and the independent solver agree on every level");
ok(storedOk, "the stored solution (used by the browser tests) is the unique valid route");
console.log("  " + rowInfo.join("  "));

// ---- rules appear in the right continent, earlier rules stay active
const has = {};
for (const c of D) { has[c.id] = { num: 0, one: 0, ord: 0 }; for (const r of c.regions) { const z = PUZ[r.id]; has[c.id].num += Object.keys(z.n).length; for (const e of z.r) if (e[2] === 1) has[c.id].one++; has[c.id].ord += (z.o || []).length; } }
ok(Object.values(has.europe).every(v => v === 0), "Europe: only start/goal + unique solution (no extra rules)");
ok(has.oceania.num > 0 && has.oceania.one + has.oceania.ord === 0, "Oceania: number clues only");
ok(has["south-america"].one > 0 && has["south-america"].ord === 0, "South America: one-way roads (+ numbers), nothing newer");
ok(has.africa.ord > 0 && has.africa.num + has.africa.one === 0, "Africa: order arrows only (identity of the continent)");
ok(Object.values(has["north-america"]).every(v => v > 0), "North America: a gentle mix of numbers, one-way roads and order arrows");
ok(Object.values(has.asia).every(v => v > 0), "Asia uses every rule");
const firstUses = { oceania: z => Object.keys(z.n).length > 0, "south-america": z => z.r.some(e => e[2] === 1), africa: z => z.o.length > 0 };
ok(Object.entries(firstUses).every(([cid, f]) => f(PUZ[D.find(c => c.id === cid).regions[0].id])), "the first level of Oceania / South America / Africa uses that continent's rule");
ok(regs.every(r => { const z = PUZ[r.id]; return z.r.every(e => (e[2] || 0) <= 1) && (!z.k || Object.keys(z.k).length === 0); }), "no gates / keys / fragile bridges exist in any level (only plain and one-way roads)");
ok(!/\bgates?\b|fragile|bridge|key city|matching key|colou?red road|locked (gate|road)|gates and keys|dashed|collapse/i.test(plain), "no gate / key / fragile / bridge / dashed wording anywhere in the game file");
ok(!/GATE_|icoLock|icoKey|broken/.test(js), "no gate / key / fragile code left (GATE_, icoLock, icoKey, broken)");
ok(!/region\.card|showRuleCard/.test(js) && regs.every(r => !("card" in r)), "no per-level rule cards any more (a continent intro replaces them)");
// every road type that exists really matters at least once per level: no rule is merely decorative (except flagged mixed levels)
let decorative = [];
for (const r of regs) { const z = JSON.parse(JSON.stringify(PUZ[r.id]));
  const relax = { num: p => { p.n = {}; }, one: p => { p.r.forEach(e => { if (e[2] === 1) e[2] = 0; }); }, ord: p => { p.o = []; } };
  const present = { num: Object.keys(z.n).length > 0, one: z.r.some(e => e[2] === 1), ord: z.o.length > 0 };
  for (const k in relax) if (present[k]) { const q = JSON.parse(JSON.stringify(z)); relax[k](q); delete q._p; if (bruteSolutions(q).length < 2) decorative.push(r.id + ":" + k); } }
console.log("  levels where one rule is not strictly needed for uniqueness: " + (decorative.join(" ") || "none"));
const mixedIds = ["ar", "cl", "co", "br", "jm", "cu", "ca", "us", "mx", "th", "jp", "id", "kr", "cn", "in"];
ok(decorative.filter(x => !mixedIds.includes(x.split(":")[0])).length === 0, "in every single-rule level the rule is truly necessary for the unique solution");
ok(decorative.length <= 16, "mixed levels: only a few individual rule uses are redundant (" + decorative.length + ")");

// ---- difficulty: teaching levels stay first, effort rises inside each continent, last continent hardest
const asc = (arr) => arr.every((v, i) => i === 0 || v >= arr[i - 1] - 12);
let monotone = true;
for (const c of D) { const hs = c.regions.map(r => effort[r.id]); const tail = hs.slice(1); if (!asc(tail)) { monotone = false; console.log("  not ascending:", c.id, hs.join()); } }
ok(monotone, "inside every continent the levels get harder (measured search effort rises, allowing tiny dips of 12 or less)");
const means = D.map(c => c.regions.reduce((s, r) => s + effort[r.id], 0) / c.regions.length);
ok(means[0] === Math.min(...means), "Europe is the easiest continent");
ok(D.every(c => effort[c.regions[0].id] <= 30), "the first level of every continent is easy (effort <= 30)");
ok(D.every(c => effort[c.regions[0].id] <= 30), "teaching levels are easy (effort <= 30)");
ok(Math.max(...D[5].regions.map(r => effort[r.id])) >= Math.max(...D[0].regions.map(r => effort[r.id])) * 1.1, "the hardest Asia level is clearly harder than the hardest Europe level");

// ---- round 5: reasonable difficulty (Stefan: later countries combined too many rules)
{
  const typesOf = z => (Object.keys(z.n).length ? 1 : 0) + (z.r.some(e => e[2] === 1) ? 1 : 0)  + (z.o.length ? 1 : 0);
  const cnt = (z, t) => z.r.filter(e => e[2] === t).length;
  const rows = [];
  let okPre = true, okAsia = true, okCities = true, okGentle = true, okTotal = true;
  for (const c of D) c.regions.forEach((r, i) => {
    const z = PUZ[r.id], t = typesOf(z), n = r.cities.length; rows.push(r.id + ":" + t + "t/" + n + "c");
    if (c.id !== "asia" && t > 2) okPre = false;
    if (c.id === "asia") { if (i < 3 && t > 2) okAsia = false; if (t > 3) okAsia = false; }
    if (n > 9 || (c.id !== "europe" && c.id !== "oceania" && n > 8 && c.id !== "asia") || (c.id === "asia" && i < 4 && n > 8)) okCities = false;
    if (i < 2 && c.id !== "europe" && c.id !== "asia" && c.id !== "north-america") { if (t > 1) okGentle = false; if (cnt(z, 1) > 4 || z.o.length > 1 || n > 7) okGentle = false; }
    if (cnt(z, 1) > 4 || z.o.length > 2 || Object.keys(z.n).length > 3) okTotal = false;
  });
  console.log("  rule types / cities per level: " + rows.join(" "));
  ok(okPre, "never more than 2 rule types in one level before Asia (numbers, one-way, order each count as one)");
  ok(okAsia, "Asia: at most 2 rule types in each of the first 3 levels, at most 3 at the end");
  ok(okGentle, "the first 2 levels of each new-rule continent use ONE rule gently (<=4 one-way, <=1 order arrow, <=7 cities; North America = 2 gentle rules)");
  ok(okCities, "city counts stay moderate (<=8 outside Europe/Oceania/last Asia levels, <=9 everywhere)");
  ok(okTotal, "no level has more than 4 one-way roads, 2 order arrows or 3 number clues");
  const Ds = D.reduce((o, c) => (o[c.id] = c.regions.map(r => r.id), o), {});
  ok(Ds.asia[0] === "th" && Ds.europe.join() === "uk,pt,fr,it,de,es", "level order: Europe unchanged, Asia opens with Thailand");
  vm.runInContext(js.slice(js.indexOf("function replayValid"), js.indexOf("function recompute")), sandbox);
  run("S={save:fresh()};S.save.doneRegions=['za'];");
  const afr = run("DATA.map(c=>c.id).indexOf('africa')"), zi = run("DATA[" + afr + "].regions.map(r=>r.id).indexOf('za')");
  ok(run(`regionUnlocked(S.save,${afr},${zi})`) === true && run(`regionUnlocked(S.save,${afr},${zi + 1})`) === true && run(`regionUnlocked(S.save,${afr},${zi - 1})`) === false || zi <= 1, "regionUnlocked: a finished country is never locked, even if the order changed in an update");
  ok(run("replayValid(PUZ.de,['leipzig','hamburg'])") === false && run("replayValid(PUZ.de,[PUZ.de.s])") === true, "replayValid rejects a saved route with a city that no longer exists (older layout)");
  const de = D[0].regions.find(r => r.id === "de");
  ok(de.cities.length >= 6 && de.cities.some(c => c.id === "berlin") && de.cities.some(c => c.id === "munich") && de.cities.some(c => c.id === "hamburg"), "Germany keeps Berlin, Munich and Hamburg");
  // map projection regression: countries must keep their real shape (Germany is taller than wide, Italy is taller than wide)
  vm.runInContext("function _t(lo,la,hi,ha){var c=cameraFromBox({minLon:lo,maxLon:hi,minLat:la,maxLat:ha},390,844,{top:92,right:16,bottom:96,left:16});var a=project(c,lo,la),b=project(c,hi,ha);return Math.abs(b.x-a.x)/Math.abs(b.y-a.y);}", sandbox);
  const asp = run("_t(6,47.5,14.7,54.7)"), real = (14.7 - 6) * Math.cos(51 * Math.PI / 180) / (54.7 - 47.5);
  ok(Math.abs(asp - real) / real < 0.03, `map projection keeps the real aspect ratio (Germany on screen ${asp.toFixed(2)} vs real ${real.toFixed(2)}; it used to be stretched 1.6x wide)`);
}


// ---- solving with the real engine (move by move) accepts the solution and rejects illegal moves
let engineWalk = true;
for (const r of regs) { const z = PUZ[r.id]; const p = [z.s]; for (let i = 1; i < z.sol.length; i++) { const st = vm.runInContext("puzState", sandbox)(z, p); if (vm.runInContext("puzCheck", sandbox)(z, p, st.vis, z.sol[i]) !== "") engineWalk = false; p.push(z.sol[i]); } }
ok(engineWalk, "puzCheck accepts every step of every stored solution");
{ const z = { s: "a", g: "d", c: ["a", "b", "c", "d"], r: [["a", "b", 1], ["b", "c", 0], ["c", "d", 0], ["a", "c", 0]], n: { b: 2 }, o: [] };
  const chk = (zz, p, to) => { const st = vm.runInContext("puzState", sandbox)(zz, p); return vm.runInContext("puzCheck", sandbox)(zz, p, st.vis, to); };
  ok(chk(z, ["a"], "b") === "", "rules unit: one-way allowed in its direction");
  ok(chk(z, ["a", "b"], "a") === "visited", "rules unit: no revisiting");
  ok(chk(z, ["b"], "a") === "oneway", "rules unit: one-way refused backwards");
  ok(chk(z, ["a"], "c") === "num:2" || chk(z, ["a"], "c").startsWith("reserved"), "rules unit: number clue reserves step 2");
  ok(chk(z, ["a", "b"], "c") === "", "rules unit: the numbered city is accepted at its own step");
  const z4 = { s: "a", g: "d", c: ["a", "b", "c", "d"], r: [["a", "b", 0], ["a", "c", 0], ["b", "d", 0], ["c", "d", 0], ["b", "c", 0]], n: {}, o: [["c", "b"]] };
  ok(chk(z4, ["a"], "b") === "order:c", "rules unit: order rule blocks a city until its predecessor is lit");
  ok(chk(z4, ["a", "c"], "b") === "", "rules unit: order rule lets the city in once its predecessor is lit");
}

// ---- save / load (v1/v2 old saves start clean, v3 saves keep progress and stars, v4 current)
const KEY = run("SAVE_KEY");
const mk = v => JSON.stringify({ v, sound: false, tutorial: 1, hints: { uk: 1 }, undos: { jp: 2 }, stars: { uk: 3, fr: 2 }, seen: { num: 1 }, currentContinent: "asia", currentRegion: "jp", partial: { jp: ["tokyo"] }, doneRegions: ["uk", "nope"], doneContinents: [] });
ok(run("fresh().v") === 4 && run("'hints' in fresh()") === false && run("typeof fresh().undos") === "object", "fresh save is v4, has undo counts and no hints");
store[KEY] = mk(1); let s1 = run("load()");
ok(s1.doneRegions.length === 0 && s1.currentRegion === "uk" && s1.sound === false && s1.v === 4, "v1 save (connect-the-dots era) -> clean v4 start, sound setting kept (nothing counts as finished)");
store[KEY] = mk(2); let s2 = run("load()");
ok(s2.doneRegions.length === 0 && s2.doneContinents.length === 0 && Object.keys(s2.partial).length === 0 && Object.keys(s2.stars).length === 0 && !("hints" in s2), "v2 save -> clean v4 start (a v2 'finished Europe' must never make the new puzzle levels look finished)");
store[KEY] = JSON.stringify({ v: 2, sound: true, tutorial: 1, hints: {}, currentContinent: "europe", currentRegion: "uk", partial: {}, doneRegions: ["uk", "pt", "fr", "it", "de", "es"], doneContinents: ["europe"] });
let s2e = run("S={save:load()};S.save");
ok(s2e.doneRegions.length === 0 && s2e.doneContinents.length === 0 && s2e.currentRegion === "uk" && run("resumeRegion()") === "uk", "REGRESSION: old v2 save with all of Europe 'done' -> Europe starts again at the United Kingdom (no jump to Oceania)");
store[KEY] = mk(3); let s3 = run("load()");
ok(s3.doneRegions.join() === "uk" && s3.stars.uk === 3 && !("fr" in s3.stars) && s3.seen["c:oceania"] === 1 && !("num" in s3.seen) && Object.keys(s3.partial).length === 0 && !("hints" in s3) && s3.v === 4 && s3.lv === 5, "v3 save migrates: finished countries + stars kept, the old 'num' card becomes the Oceania intro, routes in progress (old layout) are reset");
store[KEY] = mk(4); let s4 = run("load()");
ok(s4.stars.uk === 3 && s4.doneRegions.join() === "uk" && Object.keys(s4.partial).length === 0 && Object.keys(s4.undos).length === 0 && s4.lv === 5, "v4 save from the earlier level layout: stars and finished countries kept, routes in progress and undo counts reset");
store[KEY] = JSON.stringify({ v: 4, lv: 5, sound: true, tutorial: 1, undos: { jp: 2 }, stars: {}, seen: { "c:asia": 1, gate: 1, frag: 1, mix: 1 }, currentContinent: "asia", currentRegion: "jp", partial: { jp: ["tokyo"] }, doneRegions: [], doneContinents: [] });
{ const s5 = run("load()"); ok(s5.undos.jp === 2 && s5.partial.jp[0] === "tokyo" && s5.seen["c:asia"] === 1 && Object.keys(s5.seen).join() === "c:asia", "a v4 save of the CURRENT layout keeps routes and undo counts; cards of removed rules (gate, frag, mix) are dropped from 'seen'"); }
store[KEY] = JSON.stringify({ v: 3, sound: true, tutorial: 1, hints: {}, stars: {}, seen: { basic: 1, num: 1, one: 1, gate: 1, frag: 1, ord: 1, mix: 1 }, currentContinent: "europe", currentRegion: "uk", partial: {}, doneRegions: [], doneContinents: [] });
{ const s6 = run("load()"); ok(Object.keys(s6.seen).sort().join() === "c:europe,c:oceania,c:south-america", "old rule cards map to continent intros (Europe, Oceania, South America); Africa, North America and Asia show their intro once"); }
store[KEY] = mk(4); run("var S0=load();S0.doneRegions.push('fr');S0.stars.fr=2;saveS(S0)");
ok(run("load()").doneRegions.join() === "uk,fr" && run("load().stars.fr") === 2, "save -> load round-trip keeps progress and stars");
store[KEY] = "{broken"; ok(run("load()").doneRegions.length === 0, "corrupt save falls back to fresh");
store[KEY] = JSON.stringify({ v: 99 }); ok(run("load()").doneRegions.length === 0, "unknown version falls back to fresh");
store[KEY] = JSON.stringify({ v: 4, doneRegions: "x", stars: [], partial: 5, undos: 7 }); { const s = run("load()"); ok(Array.isArray(s.doneRegions) && typeof s.stars === "object" && !Array.isArray(s.stars) && typeof s.undos === "object", "garbled fields are repaired"); }

// ---- stars no longer depend on hints: 0 undos = 3, 1-3 = 2, more = 1
{ const fn = js.match(/function starsNow\(rid\)\{[^\n]*\}/)[0];
  const r = u => vm.runInContext("var S={save:{undos:{a:" + u + "}}};" + fn + ";starsNow('a')", sandbox);
  ok(r(0) === 3 && r(1) === 2 && r(3) === 2 && r(4) === 1 && r(9) === 1, "stars: 0 undos = 3, 1-3 undos = 2, 4+ = 1"); }

// ---- no hints anywhere, one Undo button
ok(!/hint/i.test(plain), "no 'hint' text, button or code anywhere in index.html");
ok(!/id="b-restart"|id="b-hint"|b-hint|nextHint/.test(plain), "no Restart or Hint button");
ok(/id="b-undo"/.test(plain) && /pointerdown/.test(plain) && /600/.test(plain), "Undo button with a 0.6 s long-press handler");
ok(/Tap <b>Undo<\/b>/.test(plain), "Dead-end message points to Undo");

// ---- fun facts (36) and country images (36)
const FJ = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "tools", "facts.json"), "utf8"));
const CI = run("CTRY_IMG");
ok(regs.every(r => typeof r.fact === "string" && r.fact.length >= 60 && r.fact.length <= 260), "all 36 countries have a fun fact of 60-260 characters");
ok(regs.every(r => r.fact === FJ[r.id]) && Object.keys(FJ).length === 36, "facts in the game match tools/facts.json (36)");
ok(new Set(regs.map(r => r.fact)).size === 36, "all 36 facts are different");
ok(regs.every(r => (r.fact.match(/[.!?](\s|$)/g) || []).length <= 3), "facts are short (at most 3 sentence marks)");
ok(!/electric ghost|the spark/i.test(regs.map(r => r.fact).join(" ")), "facts do not mention forbidden names");
let imgBad = [], imgKB = [];
for (const r of regs) {
  const u = CI[r.id]; if (!u || !/^data:image\/webp;base64,/.test(u)) { imgBad.push(r.id + ":missing"); continue; }
  const buf = Buffer.from(u.split(",")[1], "base64"); imgKB.push(buf.length / 1024);
  const w = buf.readUInt16LE(26) & 0x3fff, h = buf.readUInt16LE(28) & 0x3fff;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") imgBad.push(r.id + ":not webp");
  else if (w !== 480 || h !== 320) imgBad.push(`${r.id}:${w}x${h}`);
  if (buf.length > 30 * 1024 || buf.length < 8 * 1024) imgBad.push(r.id + ":" + Math.round(buf.length / 1024) + "KB");
}
ok(imgBad.length === 0 && Object.keys(CI).length === 36, "36 country images exist as WebP data URLs, 480x320, 8-30 KB each" + (imgBad.length ? " -> " + imgBad.join(" ") : ""));
console.log(`  country images: ${imgKB.length}, average ${(imgKB.reduce((a, b) => a + b, 0) / imgKB.length).toFixed(1)} KB, max ${Math.max(...imgKB).toFixed(1)} KB, total ${Math.round(imgKB.reduce((a, b) => a + b, 0))} KB`);

// ---- size budget
const bytesEnd = Buffer.byteLength(html), kbEnd = Math.round(bytesEnd / 1024);
ok(bytesEnd < 1.8 * 1024 * 1024, `index.html stays under 1.8 MB (${kbEnd} KB = ${(bytesEnd / 1048576).toFixed(2)} MB)`);
const zipFile = path.join(__dirname, "..", "itch", "glowglobe-html5.zip");
if (fs.existsSync(zipFile)) { const zb = fs.statSync(zipFile).size; ok(zb < 1.5 * 1024 * 1024, `itch zip stays under 1.5 MB (${Math.round(zb / 1024)} KB)`); }
console.log(fails ? `\n${fails} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(fails ? 1 : 0);
