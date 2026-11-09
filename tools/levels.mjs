// One-time level tuner for Glow Globe v2.
// Reads the ORIGINAL roads (tools/roads-base.json: first n-1 edges of each region are the
// intended Hamiltonian path, the rest are extra roads), then
//  1) orders continents and regions from easy to hard,
//  2) tunes each region's road network (adds short non-crossing decoy roads / drops extras)
//     so the search effort of the puzzle follows a rising curve,
//  3) verifies every region with a full solver and rewrites DATA + ROADS in index.html.
// Usage: node tools/levels.mjs
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'index.html');
let html = fs.readFileSync(file, 'utf8');
const base = JSON.parse(fs.readFileSync(path.join(here, 'roads-base.json'), 'utf8'));

const dataM = html.match(/^var DATA = (\[.*\]);\s*$/m);
const DATA0 = JSON.parse(dataM[1]);

// ---- order: continents easy -> hard, regions chosen by hand (small/loose first, tight/8-city last)
const CONT_ORDER = ['europe', 'oceania', 'south-america', 'africa', 'north-america', 'asia'];
const REG_ORDER = {
  'europe': ['uk', 'pt', 'fr', 'it', 'de', 'es'],
  'oceania': ['tas', 'wa', 'sa', 'vic', 'qld', 'nz', 'nsw'],
  'south-america': ['ec', 'pe', 'br', 'co', 'ar', 'cl'],
  'africa': ['eg', 'ke', 'ma', 'et', 'za', 'ng'],
  'north-america': ['jm', 'cu', 'ca', 'mx', 'us'],
  'asia': ['kr', 'th', 'jp', 'id', 'in', 'cn'],
};

// ---- solver
function adjOf(ids, edges) { const a = {}; ids.forEach(i => a[i] = []); for (const [x, y] of edges) { a[x].push(y); a[y].push(x); } return a; }
function solve(ids, edges) {
  const adj = adjOf(ids, edges); let sols = 0, nodes = 0; const vis = new Set();
  function dfs(n, d) { nodes++; if (d === ids.length) { sols++; return; } for (const m of adj[n]) if (!vis.has(m)) { vis.add(m); dfs(m, d + 1); vis.delete(m); } }
  for (const s of ids) { vis.add(s); dfs(s, 1); vis.delete(s); }
  return { sols: sols / 2, nodes };
}
function segCross(p1, p2, p3, p4) {
  const d = (a, b, c) => (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
function ptSeg(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }

// target search effort per global rank (0..35)
const flat = []; for (const cid of CONT_ORDER) for (const rid of REG_ORDER[cid]) flat.push(rid);
const total = flat.length;
const target = (rank, n) => { const t = rank / (total - 1); const baseT = 36 + t * 230; return baseT * (n >= 8 ? 1.1 : n <= 5 ? 0.85 : 1); };

const NEWROADS = {}; const report = [];
const regById = {}; for (const c of DATA0) for (const r of c.regions) regById[r.id] = r;
flat.forEach((rid, rank) => {
  const r = regById[rid]; const ids = r.cities.map(c => c.id); const n = ids.length;
  const pos = {}; const meanLat = r.cities.reduce((s, c) => s + c.lat, 0) / n; const cs = Math.cos(meanLat * Math.PI / 180);
  r.cities.forEach(c => pos[c.id] = [c.lon * cs, c.lat]);
  const orig = base[rid]; const pathE = orig.slice(0, n - 1); const extras = orig.slice(n - 1);
  if (solve(ids, pathE).sols < 1) throw new Error('base path broken ' + rid);
  const T = target(rank, n);
  let edges = pathE.slice(); const has = (a, b) => edges.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
  const lens = pathE.map(e => Math.hypot(pos[e[0]][0] - pos[e[1]][0], pos[e[0]][1] - pos[e[1]][1])).sort((a, b) => a - b);
  const med = lens[Math.floor(lens.length / 2)];
  // candidate pool
  const cand = []; const seen = new Set();
  for (const e of extras) { cand.push({ e, orig: true }); seen.add(e.slice().sort().join()); }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = ids[i], b = ids[j]; const k = [a, b].sort().join(); if (seen.has(k) || has(a, b)) continue;
    const L = Math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1]); if (L > med * 2.3) continue; cand.push({ e: [a, b], orig: false, L }); }
  const crossN = (e) => { let k = 0; for (const f of edges) { if (f.includes(e[0]) || f.includes(e[1])) continue; if (segCross(pos[e[0]], pos[e[1]], pos[f[0]], pos[f[1]])) k++; } return k; };
  const ok = (e) => { const [a, b] = e; for (const o of ids) { if (o === a || o === b) continue; if (ptSeg(pos[o], pos[a], pos[b]) < med * 0.16) return false; } return crossN(e) <= 1; };
  let cur = solve(ids, edges); let guard = 0;
  while (cur.nodes < T * 0.92 && edges.length < n + 5 && guard++ < 14) {
    let best = null, bs = 1e9;
    for (const cd of cand) { if (has(cd.e[0], cd.e[1])) continue; if (!cd.orig && !ok(cd.e)) continue; const s = solve(ids, edges.concat([cd.e])); if (s.nodes > T * 1.2) continue;
      const sc = Math.abs(T - s.nodes) * 0.2 + (cd.orig ? -4 : 0) + (cd.L || 0) / med * 6 + crossN(cd.e) * 12; if (s.nodes > cur.nodes && sc < bs) { bs = sc; best = { cd, s }; } }
    if (!best) break; edges.push(best.cd.e); cur = best.s;
  }
  NEWROADS[rid] = edges;
  report.push({ rank, rid, n, edges: edges.length, nodes: cur.nodes, sols: cur.sols, T: Math.round(T) });
});
// final order inside each continent: ascending achieved search effort (ties keep hand order)
const nodesOf = {}; report.forEach(x => nodesOf[x.rid] = x.nodes);
for (const cid of CONT_ORDER) REG_ORDER[cid].sort((a, b) => (nodesOf[a] - nodesOf[b]) || (REG_ORDER[cid].indexOf(a) - REG_ORDER[cid].indexOf(b)));
const flat2 = []; for (const cid of CONT_ORDER) for (const rid of REG_ORDER[cid]) flat2.push(rid);
// difficulty stars 1..5 from rank
const stars = (nodes) => nodes < 50 ? 1 : nodes < 90 ? 2 : nodes < 140 ? 3 : nodes < 220 ? 4 : 5;
const DATA1 = CONT_ORDER.map(cid => { const c = DATA0.find(x => x.id === cid); return { ...c, regions: REG_ORDER[cid].map(rid => { const r = regById[rid]; return { ...r, diff: stars(nodesOf[rid]) }; }) }; });
if (DATA1.reduce((s, c) => s + c.regions.length, 0) !== 36) throw new Error('region count');
for (const x of report) console.log(x.rank, x.rid.padEnd(4), 'cities', x.n, 'edges', x.edges, 'nodes', String(x.nodes).padStart(4), 'target', x.T, 'solutions', x.sols);
// patch
DATA1[0].blurb = DATA1[0].blurb.replace(/ — where the spark began\./, ' — the old continent, lit first.');
html = html.replace(/^var DATA = \[.*\];\s*$/m, () => 'var DATA = ' + JSON.stringify(DATA1) + ';');
html = html.replace(/^var ROADS = \{.*\};\s*$/m, () => 'var ROADS = ' + JSON.stringify(NEWROADS) + ';');
fs.writeFileSync(file, html);
console.log('index.html rewritten');
// (blurb wording fixes were applied by hand after the run: Oceania "the light crosses the ocean.")
