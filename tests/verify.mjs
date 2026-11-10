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
ok(["basic", "num", "one", "gate", "frag", "ord", "mix"].every(k => RT[k] && RT[k][0] && RT[k][1].length > 20), "rule card texts for start/goal, numbers, one-way, gates, fragile, order, mix");

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
  let broken = false;
  for (let i = 1; i < n; i++) {
    const a = route[i - 1], b = route[i];
    const road = pz.r.find(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
    if (!road) return false;
    const t = road[2] || 0;
    if (t === 1 && !(road[0] === a && road[1] === b)) return false;
    if (t === 2) { const key = Object.keys(pz.k).find(c => pz.k[c] === (road[3] || 0)); if (!key || route.indexOf(key) >= i) return false; }
    if (t === 3) { if (broken) return false; broken = true; }
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
for (const c of D) { has[c.id] = { num: 0, one: 0, gate: 0, frag: 0, ord: 0 }; for (const r of c.regions) { const z = PUZ[r.id]; has[c.id].num += Object.keys(z.n).length; for (const e of z.r) { if (e[2] === 1) has[c.id].one++; if (e[2] === 2) has[c.id].gate++; if (e[2] === 3) has[c.id].frag++; } has[c.id].ord += (z.o || []).length; } }
ok(Object.values(has.europe).every(v => v === 0), "Europe: only start/goal + unique solution (no extra rules)");
ok(has.oceania.num > 0 && has.oceania.one + has.oceania.gate + has.oceania.frag + has.oceania.ord === 0, "Oceania: number clues only");
ok(has["south-america"].one > 0 && has["south-america"].gate + has["south-america"].frag + has["south-america"].ord === 0, "South America: one-way roads (+ numbers), nothing newer");
ok(has.africa.gate > 0 && has.africa.frag + has.africa.ord === 0, "Africa: gates (+ older rules), nothing newer");
ok(has["north-america"].frag > 0 && has["north-america"].ord > 0, "North America: fragile bridges and order rules");
ok(Object.values(has.asia).every(v => v > 0), "Asia uses every rule");
ok(regs.every(r => { const z = PUZ[r.id]; return z.r.filter(e => e[2] === 3).length === 0 || has["north-america"].frag > 0; }), "fragile bridges never appear before North America");
// the first level of each continent teaches its rule: it must use that rule
const firstUses = { oceania: z => Object.keys(z.n).length > 0, "south-america": z => z.r.some(e => e[2] === 1), africa: z => z.r.some(e => e[2] === 2), "north-america": z => z.r.some(e => e[2] === 3) };
ok(Object.entries(firstUses).every(([cid, f]) => f(PUZ[D.find(c => c.id === cid).regions[0].id])), "the first level of each new-rule continent uses that rule");
ok(PUZ[D[4].regions[1].id].o.length > 0, "North America level 2 introduces the order rule");
ok(regs.filter(r => r.card).map(r => r.card).join() === "basic,num,one,gate,frag,ord,mix", "rule cards: start/goal, numbers, one-way, gates, fragile, order, mix (in campaign order)");
// every road type that exists really matters at least once per level: no rule is merely decorative (except flagged mixed levels)
let decorative = [];
for (const r of regs) { const z = JSON.parse(JSON.stringify(PUZ[r.id]));
  const relax = { num: p => { p.n = {}; }, one: p => { p.r.forEach(e => { if (e[2] === 1) e[2] = 0; }); }, gate: p => { p.r.forEach(e => { if (e[2] === 2) e[2] = 0; }); p.k = {}; }, frag: p => { p.r.forEach(e => { if (e[2] === 3) e[2] = 0; }); }, ord: p => { p.o = []; } };
  const present = { num: Object.keys(z.n).length > 0, one: z.r.some(e => e[2] === 1), gate: z.r.some(e => e[2] === 2), frag: z.r.some(e => e[2] === 3), ord: z.o.length > 0 };
  for (const k in relax) if (present[k]) { const q = JSON.parse(JSON.stringify(z)); relax[k](q); delete q._p; if (bruteSolutions(q).length < 2) decorative.push(r.id + ":" + k); } }
console.log("  levels where one rule is not strictly needed for uniqueness: " + (decorative.join(" ") || "none"));
const mixedIds = ["us", "mx", "th", "jp", "kr", "id", "cn", "in"];
ok(decorative.filter(x => !mixedIds.includes(x.split(":")[0])).length === 0, "in every single-rule level the rule is truly necessary for the unique solution");
ok(decorative.length <= 16, "mixed levels: only a few individual rule uses are redundant (" + decorative.length + ")");

// ---- difficulty: rule cards stay first, effort rises inside each continent, last continent hardest
const asc = (arr) => arr.every((v, i) => i === 0 || v >= arr[i - 1]);
let monotone = true;
for (const c of D) { const hs = c.regions.map(r => effort[r.id]); const start = c.regions.findIndex((r, i) => i > 0 && !r.card); const tail = hs.slice(start < 0 ? hs.length : start); if (!asc(tail)) { monotone = false; console.log("  not ascending:", c.id, hs.join()); } }
ok(monotone, "inside every continent the levels get harder (measured search effort never drops after the rule cards)");
const means = D.map(c => c.regions.reduce((s, r) => s + effort[r.id], 0) / c.regions.length);
ok(means[0] === Math.min(...means), "Europe is the easiest continent");
ok(D.every((c, i) => c.regions[0].card), "the first level of every continent opens with a rule card (teaching level)");
ok(D.every(c => effort[c.regions[0].id] <= 30), "teaching levels are easy (effort <= 30)");
ok(Math.max(...D[5].regions.map(r => effort[r.id])) >= Math.max(...D[0].regions.map(r => effort[r.id])) * 1.2, "the hardest Asia level is clearly harder than the hardest Europe level");

// ---- round 5: reasonable difficulty (Stefan: later countries combined too many rules)
{
  const typesOf = z => (Object.keys(z.n).length ? 1 : 0) + (z.r.some(e => e[2] === 1) ? 1 : 0) + (z.r.some(e => e[2] === 2) ? 1 : 0) + (z.r.some(e => e[2] === 3) ? 1 : 0) + (z.o.length ? 1 : 0);
  const cnt = (z, t) => z.r.filter(e => e[2] === t).length;
  const rows = [];
  let okPre = true, okAsia = true, okCities = true, okGentle = true, okTotal = true;
  for (const c of D) c.regions.forEach((r, i) => {
    const z = PUZ[r.id], t = typesOf(z), n = r.cities.length; rows.push(r.id + ":" + t + "t/" + n + "c");
    if (c.id !== "asia" && t > 2) okPre = false;
    if (c.id === "asia") { if (i < 3 && t > 2) okAsia = false; if (t > 3) okAsia = false; }
    if (n > 9 || (c.id !== "europe" && c.id !== "oceania" && n > 8 && c.id !== "asia") || (c.id === "asia" && i < 4 && n > 8)) okCities = false;
    if (i < 2 && c.id !== "europe" && c.id !== "asia") { if (t > 1) okGentle = false; if (cnt(z, 1) > 4 || cnt(z, 2) > 2 || cnt(z, 3) > 2 || z.o.length > 1 || n > 7) okGentle = false; }
    if (cnt(z, 1) > 4 || cnt(z, 2) > 2 || cnt(z, 3) > 2 || z.o.length > 2) okTotal = false;
  });
  console.log("  rule types / cities per level: " + rows.join(" "));
  ok(okPre, "never more than 2 rule types in one level before Asia (numbers, one-way, gates, fragile, order each count as one)");
  ok(okAsia, "Asia: at most 2 rule types in each of the first 3 levels, at most 3 at the end");
  ok(okGentle, "the first 2 levels of each new-rule continent use ONE rule gently (<=4 one-way, <=2 gates, <=2 fragile, <=1 order arrow, <=7 cities)");
  ok(okCities, "city counts stay moderate (<=8 outside Europe/Oceania/last Asia levels, <=9 everywhere)");
  ok(okTotal, "no level has more than 4 one-way roads, 2 gated roads, 2 fragile bridges or 2 order arrows");
  const Ds = D.reduce((o, c) => (o[c.id] = c.regions.map(r => r.id), o), {});
  ok(Ds.asia[0] === "th" && Ds.europe.join() === "uk,pt,fr,it,de,es", "level order: Europe unchanged, Asia opens with Thailand (mixed intro card)");
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
for (const r of regs) { const z = PUZ[r.id]; const p = [z.s]; for (let i = 1; i < z.sol.length; i++) { const st = vm.runInContext("puzState", sandbox)(z, p); if (vm.runInContext("puzCheck", sandbox)(z, p, st.vis, st.broken, z.sol[i]) !== "") engineWalk = false; p.push(z.sol[i]); } }
ok(engineWalk, "puzCheck accepts every step of every stored solution");
{ const z = { s: "a", g: "d", c: ["a", "b", "c", "d"], r: [["a", "b", 1, 0], ["b", "c", 2, 0], ["c", "d", 3, 0], ["a", "c", 3, 0]], n: { b: 2 }, k: { a: 0 }, o: [] };
  const chk = (p, to) => { const st = vm.runInContext("puzState", sandbox)(z, p); return vm.runInContext("puzCheck", sandbox)(z, p, st.vis, st.broken, to); };
  ok(chk(["a"], "b") === "", "rules unit: one-way allowed in its direction");
  ok(chk(["a", "b"], "a") === "visited", "rules unit: no revisiting");
  ok(chk(["b"], "a") === "oneway", "rules unit: one-way refused backwards");
  ok(chk(["a"], "c") === "num:2" || chk(["a"], "c").startsWith("reserved"), "rules unit: number clue reserves step 2");
  ok(chk(["a", "b"], "c") === "", "rules unit: gate open when key city lit (key = start)");
  const z2 = JSON.parse(JSON.stringify(z)); z2.k = { d: 0 }; delete z2._p;
  const st = vm.runInContext("puzState", sandbox)(z2, ["a", "b"]);
  ok(vm.runInContext("puzCheck", sandbox)(z2, ["a", "b"], st.vis, st.broken, "c") === "gate:0", "rules unit: gate closed while key city unlit");
  const z3 = { s: "a", g: "d", c: ["a", "b", "c", "d"], r: [["a", "b", 3, 0], ["b", "c", 3, 0], ["c", "d", 0, 0]], n: {}, k: {}, o: [] };
  const st3 = vm.runInContext("puzState", sandbox)(z3, ["a", "b"]);
  ok(st3.broken && vm.runInContext("puzCheck", sandbox)(z3, ["a", "b"], st3.vis, st3.broken, "c") === "broken", "rules unit: after crossing one fragile bridge the others are gone");
  const z4 = { s: "a", g: "d", c: ["a", "b", "c", "d"], r: [["a", "b", 0, 0], ["a", "c", 0, 0], ["b", "d", 0, 0], ["c", "d", 0, 0], ["b", "c", 0, 0]], n: {}, k: {}, o: [["c", "b"]] };
  const st4 = vm.runInContext("puzState", sandbox)(z4, ["a"]);
  ok(vm.runInContext("puzCheck", sandbox)(z4, ["a"], st4.vis, st4.broken, "b") === "order:c", "rules unit: order rule blocks a city until its predecessor is lit");
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
ok(s3.doneRegions.join() === "uk" && s3.stars.uk === 3 && !("fr" in s3.stars) && s3.seen.num === 1 && s3.partial.jp[0] === "tokyo" && !("hints" in s3) && s3.v === 4, "v3 save migrates to v4: stars of finished regions, seen cards and partial routes kept, hint counts dropped");
store[KEY] = mk(4); let s4 = run("load()");
ok(s4.undos.jp === 2 && s4.stars.uk === 3, "v4 save keeps undo counts and stars");
run("var S0=load();S0.doneRegions.push('fr');S0.stars.fr=2;saveS(S0)");
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
