// Level generator for Glow Globe v2 "real puzzle" edition.
// For every region it searches (with the shared rules engine in index.html) for a road network + rule clues
// that has EXACTLY ONE solution, uses every enabled rule for real (removing a rule type makes the puzzle ambiguous)
// and has a search effort close to the target of that level. Then it rewrites DATA (cities, order) and PUZ in index.html.
// Usage: node tools/gen-puzzles.mjs        (deterministic: fixed seeds)
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'index.html');
let html = fs.readFileSync(file, 'utf8');
const rules = html.slice(html.indexOf('/*RULES-BEGIN*/'), html.indexOf('/*RULES-END*/'));
const E = {}; vm.createContext(E); vm.runInContext(rules + ';this.puzSolve=puzSolve;this.puzPrep=puzPrep;', E);
const base = JSON.parse(fs.readFileSync(path.join(here, 'data-base.json'), 'utf8'));

// ---- extra real cities (lat, lon) so every country has 6-9 cities
const ADD = {
  fr: [['lille', 'Lille', 50.63, 3.06]],
  it: [['genoa', 'Genoa', 44.41, 8.93]],
  de: [['dresden', 'Dresden', 51.05, 13.74], ['leipzig', 'Leipzig', 51.34, 12.37]],
  es: [['zaragoza', 'Zaragoza', 41.65, -0.89], ['granada', 'Granada', 37.18, -3.6]],
  tas: [['queenstown', 'Queenstown', -42.08, 145.56]],
  wa: [['albany', 'Albany', -35.02, 117.88]],
  sa: [['coober-pedy', 'Coober Pedy', -29.01, 134.75]],
  vic: [['warrnambool', 'Warrnambool', -38.38, 142.48]],
  qld: [['rockhampton', 'Rockhampton', -23.38, 150.51]],
  nz: [['napier', 'Napier', -39.49, 176.91], ['nelson', 'Nelson', -41.27, 173.28]],
  nsw: [['tamworth', 'Tamworth', -31.09, 150.93], ['orange', 'Orange', -33.28, 149.1]],
  ar: [['salta', 'Salta', -24.78, -65.41]],
  ec: [['esmeraldas', 'Esmeraldas', 0.96, -79.65]],
  pe: [['huancayo', 'Huancayo', -12.07, -75.21]],
  cl: [['puerto-montt', 'Puerto Montt', -41.47, -72.94], ['iquique', 'Iquique', -20.21, -70.15]],
  br: [['brasilia', 'Brasilia', -15.79, -47.88], ['manaus', 'Manaus', -3.12, -60.02]],
  co: [['pasto', 'Pasto', 1.21, -77.28], ['santa-marta', 'Santa Marta', 11.24, -74.2]],
  eg: [['port-said', 'Port Said', 31.27, 32.3]],
  ke: [['garissa', 'Garissa', -0.45, 39.65]],
  ma: [['oujda', 'Oujda', 34.68, -1.91]],
  et: [['jimma', 'Jimma', 7.67, 36.83], ['adama', 'Adama', 8.54, 39.27]],
  za: [['kimberley', 'Kimberley', -28.73, 24.76], ['east-london', 'East London', -33.02, 27.91]],
  ng: [['enugu', 'Enugu', 6.46, 7.55], ['maiduguri', 'Maiduguri', 11.85, 13.16], ['sokoto', 'Sokoto', 13.06, 5.24]],
  jm: [['mandeville', 'Mandeville', 18.04, -77.51]],
  cu: [['trinidad', 'Trinidad', 21.8, -79.98]],
  ca: [['winnipeg', 'Winnipeg', 49.9, -97.14], ['halifax', 'Halifax', 44.65, -63.57]],
  mx: [['merida', 'Merida', 20.97, -89.62], ['veracruz', 'Veracruz', 19.17, -96.13]],
  us: [['denver', 'Denver', 39.74, -104.99]],
  th: [['hat-yai', 'Hat Yai', 7.01, 100.47], ['ubon-ratchathani', 'Ubon Ratchathani', 15.24, 104.85]],
  jp: [['hiroshima', 'Hiroshima', 34.39, 132.45], ['sendai', 'Sendai', 38.27, 140.87], ['kanazawa', 'Kanazawa', 36.56, 136.66]],
  id: [['semarang', 'Semarang', -6.97, 110.42], ['palembang', 'Palembang', -2.98, 104.76], ['yogyakarta', 'Yogyakarta', -7.8, 110.36]],
  kr: [['ulsan', 'Ulsan', 35.54, 129.31], ['jeju', 'Jeju', 33.5, 126.53], ['jeonju', 'Jeonju', 35.82, 127.15]],
  cn: [['wuhan', 'Wuhan', 30.59, 114.31], ['chongqing', 'Chongqing', 29.56, 106.55]],
  in: [['pune', 'Pune', 18.52, 73.86], ['lucknow', 'Lucknow', 26.85, 80.95]],
};
// ---- level plan: order inside each continent = difficulty order. t = target search effort.
// f: num = max clues, one = one-way roads, gate = number of keys/gates, frag = fragile bridges, ord = max order arrows
const PLAN = {
  // Difficulty design (round 5): the first 1-2 levels of a new rule use ONE small instance (see cap), at most 2 rule TYPES per level
  // before Asia (numbers, one-way, gates, fragile, order arrows each count as one type), Asia: 2 types in the first half, 3 at the end.
  // max = max cities (extra cities are dropped), cap = max number of roads of that kind (1 one-way, 2 gate, 3 fragile), t = target effort.
  europe: [
    { id: 'uk', t: 8, max: 6, card: 'basic', f: {} }, { id: 'pt', t: 12, max: 6, f: {} }, { id: 'fr', t: 18, max: 7, f: {} },
    { id: 'it', t: 26, max: 7, f: {} }, { id: 'de', t: 34, max: 7, f: {} }, { id: 'es', t: 44, max: 8, f: {} }],
  oceania: [
    { id: 'tas', t: 10, max: 6, card: 'num', f: { num: 1 } }, { id: 'wa', t: 15, max: 6, f: { num: 2 }, slack: 1 }, { id: 'sa', t: 22, max: 6, f: { num: 2 } },
    { id: 'vic', t: 30, max: 7, f: { num: 3 } }, { id: 'qld', t: 38, max: 7, f: { num: 3 } }, { id: 'nz', t: 48, max: 8, f: { num: 3 } }, { id: 'nsw', t: 58, max: 8, f: { num: 4 } }],
  'south-america': [
    { id: 'ec', t: 10, max: 6, card: 'one', f: { one: 1 }, cap: { 1: 3 } }, { id: 'pe', t: 16, max: 6, f: { one: 1 }, cap: { 1: 4 } },
    { id: 'ar', t: 24, max: 7, f: { one: 1, num: 2 }, cap: { 1: 4 } }, { id: 'co', t: 34, max: 7, f: { one: 1, num: 2 }, cap: { 1: 4 } },
    { id: 'cl', t: 44, max: 7, f: { one: 1, num: 3 }, cap: { 1: 4 } }, { id: 'br', t: 56, max: 8, f: { one: 1, num: 3 }, cap: { 1: 4 } }],
  africa: [
    { id: 'eg', t: 10, max: 6, card: 'gate', f: { gate: 1 }, cap: { 2: 1 } }, { id: 'ke', t: 16, max: 7, f: { gate: 1 }, cap: { 2: 2 } },
    { id: 'ma', t: 24, max: 7, f: { gate: 2 }, cap: { 2: 2 } }, { id: 'et', t: 34, max: 7, f: { gate: 1, one: 1 }, cap: { 2: 2, 1: 3 } },
    { id: 'za', t: 44, max: 8, f: { gate: 2, num: 2 }, cap: { 2: 2 } }, { id: 'ng', t: 56, max: 8, f: { gate: 2, one: 1 }, cap: { 2: 2, 1: 3 } }],
  'north-america': [
    { id: 'jm', t: 10, max: 6, card: 'frag', f: { frag: 1 }, cap: { 3: 2 } }, { id: 'cu', t: 16, max: 6, card: 'ord', f: { ord: 1 } },
    { id: 'ca', t: 26, max: 7, f: { frag: 1, ord: 1 }, cap: { 3: 2 } }, { id: 'us', t: 36, max: 7, f: { gate: 1, ord: 2 }, cap: { 2: 2 } },
    { id: 'mx', t: 46, max: 8, f: { one: 1, frag: 1 }, cap: { 1: 3, 3: 2 } }],
  asia: [
    { id: 'th', t: 16, max: 7, card: 'mix', f: { num: 2, gate: 1 }, cap: { 2: 2 } }, { id: 'jp', t: 26, max: 8, f: { one: 1, num: 2 }, cap: { 1: 4 } },
    { id: 'id', t: 36, max: 8, f: { gate: 1, ord: 1 }, cap: { 2: 2 } }, { id: 'kr', t: 48, max: 8, f: { num: 2, one: 1, frag: 1 }, cap: { 1: 3, 3: 2 } },
    { id: 'cn', t: 60, max: 9, f: { gate: 1, one: 1, ord: 2 }, cap: { 1: 3, 2: 2 } }, { id: 'in', t: 74, max: 9, f: { num: 2, gate: 1, frag: 1 }, cap: { 2: 2, 3: 2 } }],
};
const CONT_ORDER = ['europe', 'oceania', 'south-america', 'africa', 'north-america', 'asia'];

// ---- helpers
function rngOf(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const cross = (p1, p2, p3, p4) => { const d = (a, b, c) => (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]); const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4); return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)); };
const ptSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
const clone = pz => ({ s: pz.s, g: pz.g, c: pz.c, r: pz.r.map(e => e.slice()), n: { ...pz.n }, k: { ...pz.k }, o: pz.o.map(x => x.slice()) });
const solve = (pz, lim = 2) => { delete pz._p; return E.puzSolve(pz, lim); };
function perms(arr) { if (arr.length <= 1) return [arr]; const out = []; arr.forEach((x, i) => { for (const p of perms(arr.slice(0, i).concat(arr.slice(i + 1)))) out.push([x, ...p]); }); return out; }

function generate(region, cfg, seed) {
  const rnd = rngOf(seed); const ids = region.cities.map(c => c.id), n = ids.length;
  const cs = Math.cos(region.cities.reduce((s, c) => s + c.lat, 0) / n * Math.PI / 180);
  const pos = {}; region.cities.forEach(c => pos[c.id] = [c.lon * cs, c.lat]);
  const D = (a, b) => Math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1]);
  const f = cfg.f; let best = null; const att = cfg.attempt || 0; const kf = Object.keys(f).length; const allowFail = [0, 0, Math.floor(kf / 2), Math.floor(kf / 2), Math.max(0, kf - 1), Math.max(0, kf - 1)][Math.min(att, 5)]; const reach = 2.4 + att * 0.35;
  const pairCache = {};
  function routesFor(s, g) {
    const k = s + '>' + g; if (pairCache[k]) return pairCache[k];
    const mid = ids.filter(x => x !== s && x !== g); const list = [];
    for (const pm of perms(mid)) { const P = [s, ...pm, g]; let L = 0; for (let i = 0; i + 1 < P.length; i++) L += D(P[i], P[i + 1]);
      let bad = false; for (let i = 0; i + 1 < P.length && !bad; i++) for (let j = i + 2; j + 1 < P.length; j++) if (cross(pos[P[i]], pos[P[i + 1]], pos[P[j]], pos[P[j + 1]])) { bad = true; break; }
      if (!bad) list.push({ P, L }); }
    list.sort((a, b) => a.L - b.L); return (pairCache[k] = list.slice(0, Math.max(6, Math.floor(list.length * 0.12))));
  }
  const tries = cfg.tries || 260;
  const capOf = t => (cfg.cap && cfg.cap[t] !== undefined) ? cfg.cap[t] : 99; const cntT = (z, t) => z.r.filter(e => e[2] === t).length;
  for (let tr = 0; tr < tries; tr++) {
    // start / goal: prefer far-apart pairs
    const pairs = []; for (const a of ids) for (const b of ids) if (a !== b) pairs.push([a, b, D(a, b)]); pairs.sort((x, y) => y[2] - x[2]);
    const pr = pairs[Math.floor(Math.pow(rnd(), 1.6) * pairs.length * 0.5)]; const [s, g] = pr;
    const rl = routesFor(s, g); if (!rl.length) continue; const P = rl[Math.floor(rnd() * rl.length)].P; const idx = {}; P.forEach((c, i) => idx[c] = i);
    const med = P.slice(1).map((c, i) => D(c, P[i])).sort((a, b) => a - b)[Math.floor((n - 1) / 2)];
    const pz = { s, g, c: ids, r: [], n: {}, k: {}, o: [] };
    const used = new Set(); const pk = (a, b) => a < b ? a + '|' + b : b + '|' + a;
    // route edges
    for (let i = 0; i + 1 < n; i++) { let t = 0; if (f.one && rnd() < 0.55 && cntT(pz, 1) < capOf(1)) pz.r.push([P[i], P[i + 1], 1]); else pz.r.push([P[i], P[i + 1], 0]); used.add(pk(P[i], P[i + 1])); }
    // gates (key early on the route, gate later on the route)
    const gcount = f.gate || 0;
    for (let c = 0; c < gcount; c++) { const ki = 1 + Math.floor(rnd() * Math.max(1, n - 4)); const kc = P[ki]; if (pz.k[kc] !== undefined) continue;
      const cand = []; for (let j = Math.max(ki, 1); j + 1 < n; j++) if (pz.r[j][2] === 0 || pz.r[j][2] === 1) cand.push(j);
      if (!cand.length) continue; if (cand.length && rnd() < 0.75) { const j = cand[Math.floor(rnd() * cand.length)]; if (pz.r[j][2] === 0 && cntT(pz, 2) < capOf(2)) pz.r[j] = [pz.r[j][0], pz.r[j][1], 2, c]; else continue; }
      pz.k[kc] = c; }
    // fragile route edge (the route may use one fragile bridge)
    if (f.frag && rnd() < 0.5) { const cand = []; for (let j = 0; j + 1 < n; j++) if (pz.r[j][2] === 0) cand.push(j); if (cand.length) { const j = cand[Math.floor(rnd() * cand.length)]; pz.r[j] = [pz.r[j][0], pz.r[j][1], 3]; } }
    // number clues on the route
    if (f.num) { const mids = P.slice(1, n - 1); const k = 1 + Math.floor(rnd() * f.num); for (let i = 0; i < k && mids.length; i++) { const m = mids.splice(Math.floor(rnd() * mids.length), 1)[0]; pz.n[m] = idx[m] + 1; } }
    // order arrows consistent with the route
    if (f.ord) { const k = 1 + Math.floor(rnd() * f.ord); for (let i = 0; i < k; i++) { const a = 1 + Math.floor(rnd() * (n - 3)), b = a + 2 + Math.floor(rnd() * Math.max(1, n - a - 3)); if (b <= n - 2) { const A = P[a], B = P[b]; if (!pz.o.some(x => x[0] === A && x[1] === B)) pz.o.push([A, B]); } } }
    if (solve(pz).count !== 1) continue;
    // decoy roads
    const cand = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = ids[i], b = ids[j]; if (used.has(pk(a, b))) continue; const L = D(a, b); if (L > med * reach) continue; cand.push({ a, b, L }); }
    cand.sort((x, y) => x.L - y.L + (rnd() - 0.5) * med * 0.9);
    const types = [0]; if (f.one) types.push(1, 1); if (f.gate && Object.keys(pz.k).length) types.push(2, 2); if (f.frag) types.push(3, 3);
    let cur = solve(pz, 2); let decoys = 0; const maxRoads = n + 4; const maxDecoy = cfg.maxDecoy || 20;
    const featureOk = (z) => { const P0 = E.puzPrep(z); const out = []; 
      const tryOff = (fn) => { const w = clone(z); fn(w); return solve(w, 2).count > 1; };
      if (f.num && Object.keys(z.n).length && !tryOff(w => { w.n = {}; })) out.push('num');
      if (f.one && z.r.some(e => e[2] === 1) && !tryOff(w => { w.r.forEach(e => { if (e[2] === 1) e[2] = 0; }); })) out.push('one');
      if (f.gate && z.r.some(e => e[2] === 2) && !tryOff(w => { w.r.forEach(e => { if (e[2] === 2) e[2] = 0; }); })) out.push('gate');
      if (f.frag && z.r.some(e => e[2] === 3) && !tryOff(w => { w.r.forEach(e => { if (e[2] === 3) e[2] = 0; }); })) out.push('frag');
      if (f.ord && z.o.length && !tryOff(w => { w.o = []; })) out.push('ord');
      return out; };
    const need = () => { const missing = []; if (f.num && !Object.keys(pz.n).length) missing.push('num'); if (f.one && !pz.r.some(e => e[2] === 1)) missing.push('one');
      if (f.gate && !pz.r.some(e => e[2] === 2)) missing.push('gate'); if (f.frag && !pz.r.some(e => e[2] === 3)) missing.push('frag'); if (f.ord && !pz.o.length) missing.push('ord'); return missing; };
    for (const c of cand) {
      if (decoys >= maxDecoy || pz.r.length >= maxRoads) break;
      if (cur.nodes >= cfg.t && decoys > 0 && need().length === 0 && featureOk(pz).length <= allowFail) break;
      // crossing / pass-through filters
      let ok = true, cr = 0; for (const e of pz.r) { if (e.includes(c.a) || e.includes(c.b)) continue; if (cross(pos[c.a], pos[c.b], pos[e[0]], pos[e[1]])) cr++; } if (cr > (att >= 3 ? 1 : 0)) ok = false;
      if (!ok) continue; for (const o of ids) { if (o === c.a || o === c.b) continue; if (ptSeg(pos[o], pos[c.a], pos[c.b]) < med * (att >= 3 ? 0.1 : 0.2)) { ok = false; break; } } if (!ok) continue;
      const order = types.filter(t => t === 0 || cntT(pz, t) < capOf(t)).sort(() => rnd() - 0.5);
      for (const t of order) {
        const e = t === 1 ? (rnd() < 0.5 ? [c.a, c.b, 1] : [c.b, c.a, 1]) : t === 2 ? [c.a, c.b, 2, Object.values(pz.k)[Math.floor(rnd() * Object.keys(pz.k).length)]] : [c.a, c.b, t];
        pz.r.push(e); const sv = solve(pz, 2);
        if (sv.count === 1) { cur = sv; decoys++; used.add(pk(c.a, c.b)); break; }
        pz.r.pop();
      }
    }
    if (decoys === 0 && cfg.t > 10 && att < 4) continue;
    if (need().length) continue;
    const bad = featureOk(pz); if (bad.length > allowFail) continue;
    // prune redundant clues down to cfg.slack spare ones
    let spare = cfg.slack || 0;
    const prune = (getList, remove) => { for (const item of getList().slice().sort(() => rnd() - 0.5)) { const w = clone(pz); remove(w, item); if (solve(w, 2).count === 1) { if (spare > 0) { spare--; continue; } remove(pz, item); } } };
    prune(() => Object.keys(pz.n), (z, k) => { delete z.n[k]; });
    prune(() => pz.o.map(x => x.slice()), (z, it) => { z.o = z.o.filter(x => x[0] !== it[0] || x[1] !== it[1]); });
    // pruning may have removed a rule completely -> re-check
    if (need().length || featureOk(pz).length > allowFail) continue;
    const fin = solve(pz, 2); if (fin.count !== 1) continue;
    const H0 = fin.nodes + 3 * fin.dead; const score = Math.abs(H0 - cfg.t) + (pz.r.length > n + 6 ? 20 : 0);
    if (!best || score < best.score) { best = { att, score, pz: clone(pz), sol: fin.first, nodes: fin.nodes, dead: fin.dead, P, ctx: { cand: cand.slice(), pos, med, types, need: null } }; if (score <= Math.max(2, cfg.t * 0.08)) break; }
  }
  if (best) best = climb(best, region, cfg, rngOf(seed + 99), f, allowFail, ids, n);
  return best;
}

// hill climbing: keep the puzzle unique, keep every rule necessary, make it harder (until the level target is reached)
function climb(best, region, cfg, rnd, f, allowFail, ids, n) {
  const H = r => r.nodes + 3 * r.dead; let cur = best; const pos = best.ctx.pos, med = best.ctx.med;
  const pk = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  const featureFails = (z) => { const out = []; const off = (fn) => { const w = clone(z); fn(w); return solve(w, 2).count > 1; };
    if (f.num && Object.keys(z.n).length && !off(w => { w.n = {}; })) out.push('num');
    if (f.one && z.r.some(e => e[2] === 1) && !off(w => { w.r.forEach(e => { if (e[2] === 1) e[2] = 0; }); })) out.push('one');
    if (f.gate && z.r.some(e => e[2] === 2) && !off(w => { w.r.forEach(e => { if (e[2] === 2) e[2] = 0; }); })) out.push('gate');
    if (f.frag && z.r.some(e => e[2] === 3) && !off(w => { w.r.forEach(e => { if (e[2] === 3) e[2] = 0; }); })) out.push('frag');
    if (f.ord && z.o.length && !off(w => { w.o = []; })) out.push('ord'); return out; };
  const present = z => (!f.num || Object.keys(z.n).length) && (!f.one || z.r.some(e => e[2] === 1)) && (!f.gate || z.r.some(e => e[2] === 2)) && (!f.frag || z.r.some(e => e[2] === 3)) && (!f.ord || z.o.length);
  for (let step = 0; step < 500 && H(cur) < cfg.t; step++) {
    const z = clone(cur.pz); const op = rnd();
    if (op < 0.5) { // add a decoy road
      const used = new Set(z.r.map(e => pk(e[0], e[1]))); const c = []; 
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (!used.has(pk(ids[i], ids[j]))) c.push([ids[i], ids[j]]);
      if (!c.length) continue; const [a, b] = c[Math.floor(rnd() * c.length)];
      const L = Math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1]); if (L > med * 3) continue;
      let bad = false; for (const e of z.r) { if (e.includes(a) || e.includes(b)) continue; if (cross(pos[a], pos[b], pos[e[0]], pos[e[1]])) { bad = true; break; } } if (bad) continue;
      for (const o of ids) { if (o === a || o === b) continue; if (ptSeg(pos[o], pos[a], pos[b]) < med * 0.2) { bad = true; break; } } if (bad) continue;
      const t = best.ctx.types[Math.floor(rnd() * best.ctx.types.length)]; const keys = Object.values(z.k);
      z.r.push(t === 1 ? (rnd() < 0.5 ? [a, b, 1] : [b, a, 1]) : t === 2 ? [a, b, 2, keys[Math.floor(rnd() * keys.length)]] : [a, b, t]);
    } else if (op < 0.75) { // drop a clue
      const ks = Object.keys(z.n); if (rnd() < 0.5 && ks.length) delete z.n[ks[Math.floor(rnd() * ks.length)]]; else if (z.o.length) z.o.splice(Math.floor(rnd() * z.o.length), 1); else continue;
    } else { // retype a non-route road
      const i = Math.floor(rnd() * z.r.length); const e = z.r[i]; const t = best.ctx.types[Math.floor(rnd() * best.ctx.types.length)]; const keys = Object.values(z.k);
      if (t === 2 && !keys.length) continue; z.r[i] = t === 1 ? [e[0], e[1], 1] : t === 2 ? [e[0], e[1], 2, keys[Math.floor(rnd() * keys.length)]] : [e[0], e[1], t];
    }
    if (z.r.length > n + 4) continue;
    if ([1, 2, 3].some(t => z.r.filter(e => e[2] === t).length > ((cfg.cap && cfg.cap[t] !== undefined) ? cfg.cap[t] : 99))) continue;
    const sv = solve(z, 2); if (sv.count !== 1) continue; if (!present(z)) continue;
    const r2 = { ...cur, pz: z, sol: sv.first, nodes: sv.nodes, dead: sv.dead };
    if (H(r2) <= H(cur)) continue;
    if (featureFails(z).length > allowFail) continue;
    cur = r2;
  }
  return cur;
}

// ---- build everything
const baseRegions = {}; const baseCont = {}; for (const c of base) { baseCont[c.id] = c; for (const r of c.regions) baseRegions[r.id] = r; }
const PUZ = {}; const report = []; const solveInfo = {}; let seedN = +(process.env.SEED||23);
const DATA1 = CONT_ORDER.map(cid => ({
  id: cid, name: baseCont[cid].name, blurb: baseCont[cid].blurb,
  regions: PLAN[cid].map(cfg => {
    const r0 = baseRegions[cfg.id]; const r = { id: r0.id, name: r0.name, capital: r0.capital, flag: r0.flag, fact: r0.fact, cities: r0.cities.map(c => ({ id: c.id, name: c.name, lat: c.lat, lon: c.lon })) };
    for (const a of ADD[cfg.id] || []) r.cities.push({ id: a[0], name: a[1], lat: a[2], lon: a[3] });
    // fewer cities where rules are combined: drop the city that sits closest to another one (never the first = capital / biggest city)
    while (cfg.max && r.cities.length > cfg.max) { const cs0 = Math.cos(r.cities.reduce((q, c) => q + c.lat, 0) / r.cities.length * Math.PI / 180); let bi = -1, bd = 1e9;
      r.cities.forEach((c, i) => { if (i === 0) return; let m = 1e9; r.cities.forEach((d, j) => { if (i !== j) m = Math.min(m, Math.hypot((c.lon - d.lon) * cs0, c.lat - d.lat)); }); if (m < bd - 1e-9 || (Math.abs(m - bd) < 1e-9 && i > bi)) { bd = m; bi = i; } });
      r.cities.splice(bi, 1); }
    if (cfg.card) r.card = cfg.card;
    let res = null; for (let attempt = 0; attempt < 6 && !res; attempt++) res = generate(r, { ...cfg, attempt, tries: 400 + attempt * 600 }, (seedN += 7919));
    if (!res) throw new Error('no puzzle for ' + cfg.id);
    if (res.att) console.log('  (relaxed) ' + cfg.id);
    const z = res.pz; z.sol = res.sol; PUZ[cfg.id] = z; solveInfo[cfg.id] = res.nodes + 3 * res.dead;
    report.push(`${cid.padEnd(13)} ${cfg.id.padEnd(4)} cities ${r.cities.length} roads ${z.r.length} clues ${Object.keys(z.n).length} gates ${z.r.filter(e => e[2] === 2).length} one-way ${z.r.filter(e => e[2] === 1).length} fragile ${z.r.filter(e => e[2] === 3).length} order ${z.o.length} | effort ${res.nodes} (target ${cfg.t}) deadends ${res.dead}`);
    r._H = res.nodes + 3 * res.dead; return r;
  }),
}));
// inside each continent: rule-teaching levels stay first, the rest are ordered by measured hardness (search effort + dead ends)
for (const c of DATA1) { const free = c.regions.filter(r => !r.card).sort((a, b) => a._H - b._H); let k = 0; c.regions = c.regions.map(r => r.card ? r : free[k++]); }
for (const c of DATA1) for (const r of c.regions) delete r._H;

for (const c of DATA1) console.log(c.id.padEnd(14) + c.regions.map(r => r.id + ':' + r.cities.length + 'c/H' + (solveInfo[r.id])).join('  '));
const puzJson = JSON.stringify(PUZ);
html = html.replace(/^var DATA = \[.*\];\s*$/m, () => 'var DATA = ' + JSON.stringify(DATA1) + ';');
if (/^var ROADS = /m.test(html)) html = html.replace(/^var ROADS = \{.*\};\s*$/m, () => 'var PUZ = ' + puzJson + ';');
else html = html.replace(/^var PUZ = \{.*\};\s*$/m, () => 'var PUZ = ' + puzJson + ';');
fs.writeFileSync(file, html);
console.log('index.html data rewritten');
