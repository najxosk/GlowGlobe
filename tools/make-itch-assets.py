"""Builds the itch.io kit images from the real game: screenshots, cover, gameplay GIF.
Usage: python3 tools/make-itch-assets.py   (needs Playwright for Python, Chrome, ffmpeg)"""
import pathlib, subprocess, shutil, json
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri(); OUT = ROOT / 'itch'; SH = OUT / 'screenshots'; SH.mkdir(parents=True, exist_ok=True)
TMP = pathlib.Path('/tmp/gg-video'); shutil.rmtree(TMP, ignore_errors=True); TMP.mkdir()

def xy(pg, cid): return pg.evaluate("(id)=>{var c=id2city[id];return [c.x,c.y];}", cid)
SEEN = "S.save.seen={basic:1,num:1,one:1,gate:1,frag:1,ord:1,mix:1};S.save.tutorial=1;"
def sol_of(pg): return pg.evaluate("S.pz.sol")
def open_level(pg, rid, seen=True):
    pg.evaluate(("S.save=fresh();" + (SEEN if seen else "S.save.tutorial=1;") + "saveS(S.save);S.regId='%s';enterPlay();") % rid); pg.wait_for_timeout(350)
def tap_n(pg, n, touch=True, wait=250):
    for cid in sol_of(pg)[1:n + 1]:
        x, y = xy(pg, cid)
        (pg.touchscreen.tap if touch else pg.mouse.click)(x, y); pg.wait_for_timeout(wait)
def gotit(pg):
    if pg.evaluate("document.querySelector('#ov-rule').classList.contains('on')"): pg.click('#b-gotit'); pg.wait_for_timeout(250)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    # ---------- mobile screenshots ----------
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(400)
    pg.screenshot(path=str(SH / '01-mobile-menu.png'))
    pg.click('#b-play'); pg.wait_for_timeout(350)
    pg.screenshot(path=str(SH / '02-mobile-rule-card-start-goal.png')); gotit(pg)
    open_level(pg, 'tas', seen=False); pg.screenshot(path=str(SH / '03-mobile-rule-card-numbers.png')); gotit(pg); tap_n(pg, 2)
    pg.screenshot(path=str(SH / '04-mobile-number-clues.png'))
    open_level(pg, 'ec'); tap_n(pg, 3); pg.screenshot(path=str(SH / '05-mobile-one-way-roads.png'))
    open_level(pg, 'eg'); tap_n(pg, 2); pg.screenshot(path=str(SH / '06-mobile-locked-gates.png'))
    open_level(pg, 'ca'); tap_n(pg, 2); pg.screenshot(path=str(SH / '07-mobile-fragile-bridges.png'))
    open_level(pg, 'it')
    dead = pg.evaluate("""()=>{var pz=S.pz,found=null;function go(p){if(found)return;var m=puzMoves(pz,p);
        if(!m.length&&p.length<pz.c.length){found=p.slice();return;}for(var i=0;i<m.length&&!found;i++)go(p.concat([m[i]]));}go([pz.s]);return found;}""")
    for cid in dead[1:]:
        x, y = xy(pg, cid); pg.touchscreen.tap(x, y); pg.wait_for_timeout(250)
    pg.wait_for_timeout(500); pg.screenshot(path=str(SH / '08-mobile-dead-end.png'))
    open_level(pg, 'cn'); tap_n(pg, 3); pg.screenshot(path=str(SH / '09-mobile-asia-all-rules.png'))
    open_level(pg, 'fr'); tap_n(pg, 99, wait=150); pg.wait_for_selector('#b-next', state='visible', timeout=8000); pg.wait_for_timeout(1800)
    pg.screenshot(path=str(SH / '10-mobile-country-card-france.png'))
    open_level(pg, 'jp'); tap_n(pg, 99, wait=150); pg.wait_for_selector('#b-next', state='visible', timeout=8000); pg.wait_for_timeout(1800)
    pg.screenshot(path=str(SH / '11-mobile-country-card-japan.png'))
    pg.evaluate("S.save.doneRegions=DATA.find(c=>c.id==='africa').regions.map(r=>r.id);S.save.doneContinents=['africa'];S.save.stars={};DATA.find(c=>c.id==='africa').regions.forEach(function(r){S.save.stars[r.id]=3;});enterContinentHero(findContinent('africa'));"); pg.wait_for_timeout(1200)
    pg.screenshot(path=str(SH / '12-mobile-continent-glows.png'))
    ctx.close()
    # ---------- desktop screenshots ----------
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
    pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(400)
    pg.screenshot(path=str(SH / '13-desktop-menu.png'))
    open_level(pg, 'in'); tap_n(pg, 3, touch=False, wait=200); pg.wait_for_timeout(400)
    pg.screenshot(path=str(SH / '14-desktop-india.png'))
    open_level(pg, 'in'); tap_n(pg, 99, touch=False, wait=120); pg.wait_for_selector('#b-next', state='visible', timeout=8000); pg.wait_for_timeout(1800)
    pg.screenshot(path=str(SH / '15-desktop-country-card-india.png'))
    ctx.close()
    # ---------- gameplay video (mobile): rule card, UK, Tasmania numbers ----------
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=1,
                        record_video_dir=str(TMP), record_video_size={'width': 390, 'height': 844})
    pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(1600)
    pg.click('#b-play'); pg.wait_for_timeout(1800); gotit(pg); pg.wait_for_timeout(1200)
    tap_n(pg, 99, wait=650)
    pg.wait_for_selector('#b-next', state='visible', timeout=8000); pg.wait_for_timeout(1500)
    pg.evaluate("S.save.seen.basic=1;"); pg.evaluate("S.regId='tas';enterPlay();"); pg.wait_for_timeout(1800)
    pg.click('#b-gotit'); pg.wait_for_timeout(1500)
    tap_n(pg, 99, wait=650)
    pg.wait_for_selector('#b-next', state='visible', timeout=8000); pg.wait_for_timeout(1500)
    pg.evaluate("S.regId='ec';enterPlay();"); pg.wait_for_timeout(1500); gotit(pg); pg.wait_for_timeout(1200)
    tap_n(pg, 99, wait=550)
    pg.wait_for_selector('#b-next', state='visible', timeout=8000); pg.wait_for_timeout(2000)
    ctx.close(); b.close()

vid = next(TMP.glob('*.webm')); print('video', vid)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(vid), '-vf', 'fps=8,scale=250:-1:flags=lanczos,palettegen=max_colors=56', str(TMP / 'pal.png')], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(vid), '-i', str(TMP / 'pal.png'), '-lavfi', 'fps=8,scale=250:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5', str(OUT / 'gameplay.gif')], check=True)
shutil.copy(vid, OUT / 'gameplay.webm')
print('ok')
