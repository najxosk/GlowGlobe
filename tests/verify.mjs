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
vm.runInContext(js.slice(js.indexOf("var FUNNY="), js.indexOf("function enterContinentHero")), sandbox); // FUNNY, CONT_EDU, CONT_IMG
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
const D = run("DATA");
ok(D.length === 6, "6 continents");
ok(D.reduce((n, c) => n + c.regions.length, 0) === 36, "36 regions");
ok(D[0].id === "europe" && D[0].regions[0].id === "uk", "campaign starts Europe / United Kingdom");
const cities = D.reduce((n, c) => n + c.regions.reduce((k, r) => k + r.cities.length, 0), 0);
ok(cities === 219, `219 cities (${cities})`);
const IMG = run("CONT_IMG");
const imgOk = D.every(c => /^data:image\/(webp|jpeg|png);base64,/.test(IMG[c.id] || "") && IMG[c.id].length > 30000);
ok(imgOk, "CONT_IMG has an embedded picture for all 6 continents");
console.log("  continent picture sizes (KB, base64): " + D.map(c => c.id + "=" + Math.round(IMG[c.id].length / 1024)).join(" "));
ok(D.every(c => run("FUNNY")[c.id] && run("CONT_EDU")[c.id]), "continent blurbs + facts present");

// ---- every level solved by an independent solver
function solve(ids, edges) {
  const adj = {}; ids.forEach(i => adj[i] = []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  let sols = 0, nodes = 0; const vis = new Set();
  const dfs = (n, d) => { nodes++; if (d === ids.length) { sols++; return; } for (const x of adj[n]) if (!vis.has(x)) { vis.add(x); dfs(x, d + 1); vis.delete(x); } };
  for (const s of ids) { vis.add(s); dfs(s, 1); vis.delete(s); }
  return { sols: sols / 2, nodes };
}
const ROADS = run("ROADS");
let allSolvable = true, rows = [];
const effort = {};
for (const c of D) for (const r of c.regions) {
  const ids = r.cities.map(x => x.id);
  const edgesOk = ROADS[r.id].every(([a, b]) => ids.includes(a) && ids.includes(b) && a !== b);
  const s = solve(ids, ROADS[r.id]);
  effort[r.id] = s.nodes;
  if (!edgesOk || s.sols < 1) { allSolvable = false; console.log("  UNSOLVABLE/BAD:", r.id); }
  rows.push(`${r.id}:${ids.length}c/${ROADS[r.id].length}r/${s.sols}sol/${s.nodes}n`);
}
ok(allSolvable, "all 36 levels have a valid road graph and at least one full route (solver)");
console.log("  " + rows.join("  "));

// ---- difficulty curve: within each continent effort never drops, 8-city levels come late, finale is the hardest
let monotone = true;
for (const c of D) for (let i = 1; i < c.regions.length; i++) if (effort[c.regions[i].id] < effort[c.regions[i - 1].id]) monotone = false;
ok(monotone, "inside every continent the levels get harder (search effort never drops)");
const eight = D.map(c => c.regions.map((r, i) => ({ r, i, n: c.regions.length })).filter(x => x.r.cities.length >= 8)).flat();
ok(eight.every(x => x.i >= x.n - 2), "8-city levels are the last two of their continent");
const means = D.map(c => c.regions.reduce((s, r) => s + effort[r.id], 0) / c.regions.length);
ok(means[0] === Math.min(...means), "Europe is the easiest continent (intro)");
ok(means[means.length - 1] === Math.max(...means), "the last continent is the hardest");
const lastRegions = D[D.length - 1].regions;
ok(effort[lastRegions[lastRegions.length - 1].id] >= Math.max(...Object.values(effort)) * 0.7, "the game does not end on easy content");
ok(Math.max(...D[0].regions.map(r => effort[r.id])) <= 100, "first continent stays gentle (<=100 search nodes)");

// ---- save / load (v1 and v2 accepted)
const KEY = run("SAVE_KEY");
const mk = v => JSON.stringify({ v, sound: false, tutorial: 1, hints: { uk: 1 }, currentContinent: "asia", currentRegion: "jp", partial: { jp: ["tokyo"] }, doneRegions: ["uk", "nope"], doneContinents: [] });
store[KEY] = mk(1); let s1 = run("load()");
ok(s1.doneRegions.join() === "uk" && s1.currentRegion === "jp" && s1.sound === false, "load() accepts a v1 save (and drops unknown ids)");
store[KEY] = mk(2); let s2 = run("load()");
ok(s2.doneRegions.join() === "uk" && s2.partial.jp[0] === "tokyo", "load() accepts a v2 save");
run("var S0=load();S0.doneRegions.push('fr');saveS(S0)");
ok(run("load()").doneRegions.join() === "uk,fr", "save -> load round-trip keeps progress");
store[KEY] = "{broken"; ok(run("load()").doneRegions.length === 0, "corrupt save falls back to fresh");
store[KEY] = JSON.stringify({ v: 99 }); ok(run("load()").doneRegions.length === 0, "unknown version falls back to fresh");

console.log(fails ? `\n${fails} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(fails ? 1 : 0);
