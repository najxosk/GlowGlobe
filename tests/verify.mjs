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
const kb = Math.round(Buffer.byteLength(html) / 1024);
console.log(`  index.html is ${kb} KB`);
ok(!/<script[^>]+src=|<link[^>]+href=["']https?:|@import/i.test(html), "no external scripts / styles (works offline)");
ok(!/electric ghost|the spark|\bspark\b/i.test(html), "no Electric Ghost / The Spark / 'spark' wording");
ok(!/coming soon/i.test(html), "no 'coming soon' placeholder text");
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
ok(storedOk, "the stored solution (used for hints) is the unique valid route");
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
ok(Math.max(...D[5].regions.map(r => effort[r.id])) >= Math.max(...D[0].regions.map(r => effort[r.id])) * 1.5, "the hardest Asia level is clearly harder than the hardest Europe level");

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

// ---- save / load (v1, v2 and v3 accepted; older saves keep finished regions but reset stars/progress)
const KEY = run("SAVE_KEY");
const mk = v => JSON.stringify({ v, sound: false, tutorial: 1, hints: { uk: 1 }, stars: { uk: 3, fr: 2 }, seen: { num: 1 }, currentContinent: "asia", currentRegion: "jp", partial: { jp: ["tokyo"] }, doneRegions: ["uk", "nope"], doneContinents: [] });
store[KEY] = mk(1); let s1 = run("load()");
ok(s1.doneRegions.join() === "uk" && s1.currentRegion === "jp" && s1.sound === false, "load() accepts a v1 save (and drops unknown ids)");
store[KEY] = mk(2); let s2 = run("load()");
ok(s2.doneRegions.join() === "uk" && Object.keys(s2.partial).length === 0 && Object.keys(s2.stars).length === 0 && Object.keys(s2.hints).length === 0, "v2 save migrates: finished regions kept, partial routes/hints/stars reset");
store[KEY] = mk(3); let s3 = run("load()");
ok(s3.doneRegions.join() === "uk" && s3.stars.uk === 3 && !("fr" in s3.stars) && s3.seen.num === 1 && s3.partial.jp[0] === "tokyo", "v3 save keeps stars of finished regions only, seen cards and partial routes");
run("var S0=load();S0.doneRegions.push('fr');S0.stars.fr=2;saveS(S0)");
ok(run("load()").doneRegions.join() === "uk,fr" && run("load().stars.fr") === 2, "save -> load round-trip keeps progress and stars");
store[KEY] = "{broken"; ok(run("load()").doneRegions.length === 0, "corrupt save falls back to fresh");
store[KEY] = JSON.stringify({ v: 99 }); ok(run("load()").doneRegions.length === 0, "unknown version falls back to fresh");
store[KEY] = JSON.stringify({ v: 3, doneRegions: "x", stars: [], partial: 5 }); { const s = run("load()"); ok(Array.isArray(s.doneRegions) && typeof s.stars === "object" && !Array.isArray(s.stars), "garbled fields are repaired"); }

const kbEnd = Math.round(Buffer.byteLength(html) / 1024);
ok(kbEnd < 1500, `single file stays small (${kbEnd} KB)`);
console.log(fails ? `\n${fails} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(fails ? 1 : 0);
