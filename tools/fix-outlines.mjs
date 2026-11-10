// Replaces the outlines of Jamaica and Egypt by Natural Earth 50m shapes (public domain), simplified (Douglas-Peucker).
// Needs /tmp/ne50.geojson (https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson). Idempotent.
import fs from 'fs';
const f = new URL('../index.html', import.meta.url).pathname;
const g = JSON.parse(fs.readFileSync('/tmp/ne50.geojson', 'utf8'));
const dp = (pts, eps) => { if (pts.length < 3) return pts; let mx = 0, mi = 0; const a = pts[0], b = pts[pts.length - 1];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * (pts[i][0] - a[0]) - dx * (pts[i][1] - a[1])) / L; if (d > mx) { mx = d; mi = i; } }
  if (mx > eps) { const l = dp(pts.slice(0, mi + 1), eps), r = dp(pts.slice(mi), eps); return l.slice(0, -1).concat(r); } return [a, b]; };
const take = (name, eps) => { const ft = g.features.find(x => (x.properties.NAME || x.properties.ADMIN) === name);
  const polys = ft.geometry.type === 'Polygon' ? [ft.geometry.coordinates] : ft.geometry.coordinates;
  return polys.map(p => { let r = p[0].slice(0, -1); const h = r.length >> 1; const s = dp(r.slice(0, h + 1), eps).slice(0, -1).concat(dp(r.slice(h).concat([r[0]]), eps).slice(0, -1)); return s.map(q => [+q[0].toFixed(3), +q[1].toFixed(3)]); }).filter(r => r.length >= 4); };
const lines = fs.readFileSync(f, 'utf8').split('\n'); const key = 'var RINGS = ';
const i = lines.findIndex(l => l.startsWith(key)); const R = JSON.parse(lines[i].slice(key.length).replace(/;\s*$/, ''));
R.jm = take('Jamaica', 0.012); R.eg = take('Egypt', 0.03);
console.log('jm', R.jm.map(r => r.length), 'eg', R.eg.map(r => r.length));
lines[i] = key + JSON.stringify(R) + ';'; fs.writeFileSync(f, lines.join('\n'));
