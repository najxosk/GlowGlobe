// prints per level: cities, roads and which mechanics are used (node tools/analyze.mjs)
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', process.argv[2] || 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const store = {}; const ctxStub = new Proxy({}, { get: (o, p) => (p in o ? o[p] : () => ({ addColorStop() {} })), set: (o, p, v) => { o[p] = v; return true; } });
const sb = { document: { querySelector: () => ({ getContext: () => ctxStub, style: {}, addEventListener() {} }) }, window: {}, innerWidth: 390, innerHeight: 844, devicePixelRatio: 1, addEventListener() {}, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }, console, Math, JSON, Set, Array, Object, Date };
vm.createContext(sb); vm.runInContext(js.slice(0, js.indexOf('/* ---- audio ---- */')), sb);
const D = vm.runInContext('DATA', sb), PUZ = vm.runInContext('PUZ', sb);
for (const c of D) { console.log('== ' + c.id);
  for (const r of c.regions) { const z = PUZ[r.id]; const m = [];
    const nn = Object.keys(z.n).length, one = z.r.filter(e => e[2] === 1).length, gate = z.r.filter(e => e[2] === 2).length, frag = z.r.filter(e => e[2] === 3).length, ord = z.o.length;
    if (nn) m.push('num' + nn); if (one) m.push('one' + one); if (gate) m.push('gate' + gate); if (frag) m.push('frag' + frag); if (ord) m.push('ord' + ord);
    const types = (nn ? 1 : 0) + (one ? 1 : 0) + (gate ? 1 : 0) + (frag ? 1 : 0) + (ord ? 1 : 0);
    const sol = vm.runInContext('(function(z){delete z._p;return puzSolve(z,2)})', sb)(z);
    console.log(r.id.padEnd(4), 'cities', r.cities.length, 'roads', z.r.length, 'types', types, m.join(' ').padEnd(28), 'unique', sol.count === 1, 'H', sol.nodes + 3 * sol.dead, r.card ? 'card:' + r.card : ''); } }
