"""Builds the itch.io kit images from the real game: screenshots, cover, gameplay GIF.
Usage: python3 tools/make-itch-assets.py   (needs Playwright for Python, Chrome, ffmpeg)"""
import pathlib, subprocess, shutil, json
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri(); OUT = ROOT / 'itch'; SH = OUT / 'screenshots'; SH.mkdir(parents=True, exist_ok=True)
TMP = pathlib.Path('/tmp/gg-video'); shutil.rmtree(TMP, ignore_errors=True); TMP.mkdir()

def solve(adj, ids):
    def dfs(path, seen):
        if len(path) == len(ids): return path
        for m in adj[path[-1]]:
            if m not in seen:
                r = dfs(path + [m], seen | {m})
                if r: return r
    for s in ids:
        r = dfs([s], {s})
        if r: return r

def xy(pg, cid): return pg.evaluate("(id)=>{var c=id2city[id];return [c.x,c.y];}", cid)
def path_of(pg): return solve(pg.evaluate("NBR[S.regId]"), pg.evaluate("S.cities.map(c=>c.c.id)"))

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    # ---------- mobile screenshots ----------
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(400)
    pg.screenshot(path=str(SH / '01-mobile-menu.png'))
    pg.click('#b-play'); pg.wait_for_timeout(300)
    path = path_of(pg)
    for cid in path[:3]:
        x, y = xy(pg, cid); pg.touchscreen.tap(x, y); pg.wait_for_timeout(250)
    pg.wait_for_timeout(250); pg.screenshot(path=str(SH / '02-mobile-united-kingdom.png'))
    pg.evaluate("S.save=fresh();S.save.tutorial=1;saveS(S.save);S.regId='cn';enterPlay();"); pg.wait_for_timeout(300)
    for cid in path_of(pg)[:5]:
        x, y = xy(pg, cid); pg.touchscreen.tap(x, y); pg.wait_for_timeout(200)
    pg.wait_for_timeout(500); pg.screenshot(path=str(SH / '03-mobile-china.png'))
    pg.evaluate("S.save.doneRegions=DATA.find(c=>c.id==='africa').regions.map(r=>r.id);S.save.doneContinents=['africa'];enterContinentHero(findContinent('africa'));"); pg.wait_for_timeout(1200)
    pg.screenshot(path=str(SH / '04-mobile-continent-glows.png'))
    ctx.close()
    # ---------- desktop screenshots ----------
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
    pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(400)
    pg.screenshot(path=str(SH / '05-desktop-menu.png'))
    pg.evaluate("S.save.tutorial=1;S.regId='cn';enterPlay();"); pg.wait_for_timeout(300)
    for cid in path_of(pg)[:6]:
        x, y = xy(pg, cid); pg.mouse.click(x, y); pg.wait_for_timeout(200)
    pg.wait_for_timeout(500); pg.screenshot(path=str(SH / '06-desktop-china.png'))
    ctx.close()
    # ---------- gameplay video (mobile) ----------
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=1,
                        record_video_dir=str(TMP), record_video_size={'width': 390, 'height': 844})
    pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(1800)
    pg.click('#b-play'); pg.wait_for_timeout(1800)
    path = path_of(pg)
    for cid in path:
        x, y = xy(pg, cid); pg.touchscreen.tap(x, y); pg.wait_for_timeout(650)
    pg.wait_for_selector('#b-next', state='visible', timeout=8000); pg.wait_for_timeout(1500)
    pg.click('#b-next'); pg.wait_for_timeout(1200)
    path = path_of(pg)
    for cid in path:
        x, y = xy(pg, cid); pg.touchscreen.tap(x, y); pg.wait_for_timeout(450)
    pg.wait_for_selector('#b-next', state='visible', timeout=8000); pg.wait_for_timeout(1300)
    pg.evaluate("S.save.doneRegions=DATA.find(c=>c.id==='europe').regions.map(r=>r.id);S.save.doneContinents=['europe'];enterContinentHero(findContinent('europe'));")
    pg.wait_for_timeout(3000)
    ctx.close(); b.close()

vid = next(TMP.glob('*.webm')); print('video', vid)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(vid), '-vf', 'fps=12,scale=300:-1:flags=lanczos,palettegen=max_colors=96', str(TMP / 'pal.png')], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(vid), '-i', str(TMP / 'pal.png'), '-lavfi', 'fps=12,scale=300:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4', str(OUT / 'gameplay.gif')], check=True)
shutil.copy(vid, OUT / 'gameplay.webm')
print('ok')
