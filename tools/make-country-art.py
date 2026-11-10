"""Compresses art/src-c-<id>.jpg (AI-generated country scenes) to 480x320 WebP in art/country/<id>.webp.
Quality is tuned per image so each file lands between ~17 and 22 KB (hard cap 28 KB).  Usage: python3 tools/make-country-art.py"""
import io, pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'art' / 'country'; OUT.mkdir(exist_ok=True)
TARGET = 21000; CAP = 28000
TOP = {'uk': 0, 'fr': 0, 'th': 0, 'jp': 0, 'cu': 0.5, 'za': 0.4}   # vertical crop position (0 = keep the top, 0.5 = centre); default 0.3
tot = 0
for f in sorted((ROOT / 'art').glob('src-c-*.jpg')):
    cid = f.stem[6:]; im = Image.open(f).convert('RGB'); w, h = im.size
    ch = int(round(w * 2 / 3)); top = int((h - ch) * TOP.get(cid, 0.3))
    im = im.crop((0, top, w, top + ch)).resize((480, 320), Image.LANCZOS)
    lo, hi, best = 20, 90, None
    while lo <= hi:
        q = (lo + hi) // 2; b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); n = len(b.getvalue())
        if n <= TARGET: best = (q, b.getvalue()); lo = q + 1
        else: hi = q - 1
    if best is None:
        b = io.BytesIO(); im.save(b, 'WEBP', quality=20, method=6); best = (20, b.getvalue())
    assert len(best[1]) <= CAP, (cid, len(best[1]))
    (OUT / (cid + '.webp')).write_bytes(best[1]); tot += len(best[1])
    print(f'{cid:4} q{best[0]:3} {len(best[1])/1024:5.1f} KB')
print('total', round(tot / 1024), 'KB for', len(list(OUT.glob("*.webp"))), 'images')
