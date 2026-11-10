// Replaces degenerate rings (islands that simplification collapsed into a 2-point line, drawn as a stray segment)
// by a small lens-shaped island of the same length; drops the tiny ones. Idempotent. Usage: node tools/fix-rings.mjs
import fs from 'fs';
const f = new URL('../index.html', import.meta.url).pathname;
const lines = fs.readFileSync(f, 'utf8').split('\n');
const area = r => { let a = 0; for (let j = 0; j < r.length; j++) { const p = r[j], q = r[(j + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
const fix = r => {
  if (new Set(r.map(p => p.join())).size >= 4 && area(r) > 0.0005) return r;
  const a = r[0], b = r.find(p => p.join() !== a.join()); if (!b) return null;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 0.12) return null;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, ux = dx / L, uy = dy / L, vx = -uy, vy = ux, A = L / 2, B = Math.max(0.05, L * 0.2);
  const o = []; for (let i = 0; i < 12; i++) { const t = i / 12 * 2 * Math.PI, s = Math.cos(t) * A, w = Math.sin(t) * B; o.push([+(mx + ux * s + vx * w).toFixed(3), +(my + uy * s + vy * w).toFixed(3)]); }
  return o;
};
let ch = 0;
for (const key of ['var RINGS = ', 'var LAND = ']) {
  const i = lines.findIndex(l => l.startsWith(key)); const obj = JSON.parse(lines[i].slice(key.length).replace(/;\s*$/, ''));
  const per = rs => rs.map(fix).filter(Boolean);
  const out = Array.isArray(obj) ? per(obj) : Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, per(v)]));
  const nl = key + JSON.stringify(out) + ';'; if (nl !== lines[i]) { ch++; lines[i] = nl; }
}
fs.writeFileSync(f, lines.join('\n')); console.log('changed lines', ch);
