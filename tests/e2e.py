"""Browser tests for Glow Globe (Playwright for Python + system Chrome).
Usage:  python3 tests/e2e.py            (writes screenshots to tests/shots/)
Plays real taps at 390x844 (touch) and 1280x720 (mouse), checks persistence, label overlap,
tap precision, button sizes, credits screen and console errors."""
import os, sys, json, time, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()
SHOTS = ROOT / 'tests' / 'shots'; SHOTS.mkdir(exist_ok=True)
fails = []; errors = []
def ok(c, label):
    print(('PASS  ' if c else 'FAIL  ') + label)
    if not c: fails.append(label)

def solve_path(adj, ids):
    sys.setrecursionlimit(10000)
    def dfs(path, seen):
        if len(path) == len(ids): return path
        for m in adj[path[-1]]:
            if m not in seen:
                r = dfs(path + [m], seen | {m})
                if r: return r
        return None
    for s in ids:
        r = dfs([s], {s})
        if r: return r
    return None

def new_page(p, w, h, touch):
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch, device_scale_factor=2 if touch else 1)
    pg = ctx.new_page()
    pg.on('console', lambda m: errors.append(f'[{w}x{h}] console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errors.append(f'[{w}x{h}] pageerror: {e}'))
    pg.on('requestfailed', lambda r: errors.append(f'[{w}x{h}] requestfailed: {r.url[:80]}'))
    pg.goto(URL); pg.wait_for_timeout(300)
    return b, ctx, pg

def tap(pg, touch, x, y):
    if touch: pg.touchscreen.tap(x, y)
    else: pg.mouse.click(x, y)

def city_xy(pg, cid):
    return pg.evaluate("(id)=>{var c=id2city[id];return [c.x,c.y];}", cid)

def play_region(pg, touch, rid, shot=None, mid_shot=None):
    pg.evaluate("(r)=>{S.regId=r;enterPlay();}", rid)
    pg.wait_for_timeout(150)
    ids = pg.evaluate("S.cities.map(c=>c.c.id)")
    adj = pg.evaluate("NBR[S.regId]")
    path = solve_path(adj, ids)
    ok(path is not None, f'{rid}: solver finds a full route')
    for i, cid in enumerate(path):
        x, y = city_xy(pg, cid); tap(pg, touch, x, y); pg.wait_for_timeout(60)
        if i == 2 and mid_shot: pg.screenshot(path=str(SHOTS / mid_shot))
    lit = pg.evaluate("S.lit.size")
    ok(lit == len(ids), f'{rid}: tapped {len(ids)} cities, lit={lit}')
    pg.wait_for_function("document.querySelector('#ov-hero').classList.contains('on')", timeout=6000)
    if shot: pg.screenshot(path=str(SHOTS / shot))
    return len(ids)

def geometry_checks(pg, touch, label):
    res = pg.evaluate("""()=>{var out=[];
      DATA.forEach(function(co){co.regions.forEach(function(r){S.regId=r.id;enterPlay();
        var cs=S.cities,n=cs.length,hidden=0,ov=0,minD=1e9,badHit=0,offHit=0,oob=0;
        for(var i=0;i<n;i++){if(cs[i].hide)hidden++;
          var ri=cs[i].rect;if(ri.x0<0||ri.x1>W||ri.y0<40||ri.y1>H-40)oob++;
          for(var j=i+1;j<n;j++){minD=Math.min(minD,Math.hypot(cs[i].x-cs[j].x,cs[i].y-cs[j].y));
            if(!cs[i].hide&&!cs[j].hide){var a=ri,b=cs[j].rect;var w=Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0),h=Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0);if(w>1&&h>1)ov++;}}
          if(hit(cs[i].x,cs[i].y,'touch')!==cs[i].c.id)badHit++;
          // nearest neighbour city: tap 40% of the way towards it, must still pick this city
          var nj=-1,nd=1e9;for(var k=0;k<n;k++)if(k!==i){var d=Math.hypot(cs[i].x-cs[k].x,cs[i].y-cs[k].y);if(d<nd){nd=d;nj=k;}}
          var f=Math.min(0.45,26/nd),tx=cs[i].x+(cs[nj].x-cs[i].x)*f,ty=cs[i].y+(cs[nj].y-cs[i].y)*f;if(hit(tx,ty,'touch')!==cs[i].c.id)offHit++;}
        out.push({id:r.id,hidden:hidden,ov:ov,minD:Math.round(minD),badHit:badHit,offHit:offHit,oob:oob});});});
      S.save=fresh();saveS(S.save);return out;}""")
    bad = [r for r in res if r['ov'] or r['badHit'] or r['offHit'] or r['oob']]
    hidden = sum(r['hidden'] for r in res)
    print(f'  {label}: min city distance {min(r["minD"] for r in res)}px, hidden labels {hidden}')
    ok(not bad, f'{label}: no overlapping labels / tap misses / off-screen labels in all 36 levels' + ('' if not bad else ' -> ' + json.dumps(bad)))
    ok(hidden <= 3, f'{label}: at most 3 labels hidden in total (hidden={hidden})')

with sync_playwright() as p:
    # ---------------- mobile ----------------
    b, ctx, pg = new_page(p, 390, 844, True)
    ok('Picture coming soon' not in pg.content(), 'no placeholder text')
    ok(pg.evaluate("document.querySelector('link[rel=icon]')!==null"), 'inline favicon present')
    ok(pg.inner_text('#b-play') == 'Start in Europe', 'fresh title says Start in Europe')
    pg.screenshot(path=str(SHOTS / 'm-01-title.png'))
    geometry_checks(pg, True, 'mobile 390x844')
    pg.reload(); pg.wait_for_timeout(200)
    # credits
    pg.click('#b-credits'); txt = pg.inner_text('#ov-credits')
    ok('Natural Earth' in txt and 'najxosk' in txt and 'AI' in txt and 'Super Free AI Game Jam #2' in txt, 'credits screen mentions AI, Natural Earth, najxosk, the jam')
    ok('electric ghost' not in pg.content().lower() and 'the spark' not in pg.content().lower(), 'no Electric Ghost / The Spark text')
    pg.screenshot(path=str(SHOTS / 'm-02-credits.png')); pg.click('#ov-credits #b-close')
    # first level on a NON-UK continent -> tutorial
    pg.click('button[id="b-con:asia"]'); pg.wait_for_timeout(100)
    pg.screenshot(path=str(SHOTS / 'm-03-asia-overlay.png'))
    first = pg.evaluate("DATA.find(c=>c.id==='asia').regions[0].id")
    pg.click(f'.regcell[data-id="{first}"]'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#tut'), f'tutorial shown on first level played (Asia/{first})')
    pg.screenshot(path=str(SHOTS / 'm-04-first-level-tutorial.png'))
    # button sizes
    for bid in ['b-menu', 'b-undo', 'b-restart', 'b-hint']:
        bb = pg.locator('#' + bid).bounding_box()
        ok(bb['height'] >= 44 and bb['width'] >= 44, f'#{bid} is {round(bb["width"])}x{round(bb["height"])} (>=44px)')
    # first tap, counter, highlight
    ids = pg.evaluate("S.cities.map(c=>c.c.id)"); adj = pg.evaluate("NBR[S.regId]"); path = solve_path(adj, ids)
    x, y = city_xy(pg, path[0]); pg.touchscreen.tap(x, y); pg.wait_for_timeout(120)
    ok(pg.inner_text('#playhead').strip().endswith(f'1/{len(ids)}'), 'counter shows 1/N after the first city: ' + pg.inner_text('#playhead').strip())
    ok(pg.evaluate("S.nextIds.length")>=1, 'allowed neighbours are highlighted after first tap')
    pg.screenshot(path=str(SHOTS / 'm-05-after-first-tap.png'))
    # reload mid-level -> progress persists
    pg.reload(); pg.wait_for_timeout(250)
    ok(pg.inner_text('#b-play') == 'Continue', 'after reload the title offers Continue')
    pg.click('#b-play'); pg.wait_for_timeout(200)
    ok(pg.evaluate("S.path.length") == 1 and pg.evaluate("S.regId") == first, 'reload keeps the partly-played level (1 city lit)')
    ok(pg.inner_text('#playhead').strip().endswith(f'1/{len(ids)}'), 'counter restored after reload')
    # finish this level properly with touches
    for cid in path[1:]:
        x, y = city_xy(pg, cid); pg.touchscreen.tap(x, y); pg.wait_for_timeout(60)
    pg.wait_for_function("document.querySelector('#ov-hero').classList.contains('on')", timeout=6000)
    pg.screenshot(path=str(SHOTS / 'm-06-region-card.png'))
    ok(pg.evaluate("S.save.doneRegions.indexOf(S.regId)>=0"), 'region saved as done')
    pg.reload(); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.save.doneRegions.length") == 1, 'finished level persists after reload')
    # wrong tap message & dead end handling (not connected city)
    pg.click('#b-play'); pg.wait_for_timeout(200)
    # Europe/UK full flow with touches incl. a wrong tap
    pg.evaluate("S.regId='uk';enterPlay();"); pg.wait_for_timeout(100)
    ids = pg.evaluate("S.cities.map(c=>c.c.id)"); adj = pg.evaluate("NBR[S.regId]"); path = solve_path(adj, ids)
    x, y = city_xy(pg, path[0]); pg.touchscreen.tap(x, y); pg.wait_for_timeout(80)
    far = [c for c in ids if c not in path[:2] and c not in adj[path[0]]]
    if far:
        x, y = city_xy(pg, far[0]); pg.touchscreen.tap(x, y); pg.wait_for_timeout(80)
        ok(pg.evaluate("S.path.length") == 1, 'tapping a non-connected city is rejected')
    pg.click('#b-undo'); ok(pg.evaluate("S.path.length") == 0, 'Undo works'); pg.screenshot(path=str(SHOTS / 'm-07-uk-start.png'))
    # play levels on several continents with real touches
    for rid, shot in [('uk', None), ('tas', None), ('ar', None), ('ke', None), ('mx', None), ('cn', 'm-08-china-card.png')]:
        play_region(pg, True, rid, shot, mid_shot='m-09-uk-playing.png' if rid == 'uk' else ('m-10-china-playing.png' if rid == 'cn' else None))
        pg.reload(); pg.wait_for_timeout(200)
    ok(pg.evaluate("S.save.doneRegions.length") >= 6, 'six levels across 6 continents persisted through reloads: ' + str(pg.evaluate("S.save.doneRegions")))
    # complete whole Oceania through the UI flow -> continent artwork
    pg.evaluate("S.save=fresh();saveS(S.save);"); pg.reload(); pg.wait_for_timeout(200)
    pg.click('button[id="b-con:oceania"]'); pg.wait_for_timeout(100)
    regs = pg.evaluate("DATA.find(c=>c.id==='oceania').regions.map(r=>r.id)")
    pg.click(f'.regcell[data-id="{regs[0]}"]'); pg.wait_for_timeout(150)
    for i, rid in enumerate(regs):
        pg.wait_for_function(f"S.regId==='{rid}'&&S.screen==='play'", timeout=4000)
        ids = pg.evaluate("S.cities.map(c=>c.c.id)"); adj = pg.evaluate("NBR[S.regId]"); path = solve_path(adj, ids)
        for cid in path:
            x, y = city_xy(pg, cid); pg.touchscreen.tap(x, y); pg.wait_for_timeout(50)
        pg.wait_for_selector('#b-next', state='visible', timeout=6000)
        if i == len(regs) - 1:
            ok(pg.inner_text('#b-next') == 'Continent is alight!', 'last region button says Continent is alight!')
        pg.click('#b-next'); pg.wait_for_timeout(250)
    ok(pg.is_visible('#b-nextc'), 'continent completion screen shown')
    ok(pg.evaluate("(function(){var i=document.querySelector('#ov-hero img.rewardimg');return !!i&&i.complete&&i.naturalWidth>=700;})()"), 'continent artwork rendered (>=700px wide)')
    ok('coming soon' not in pg.inner_text('#ov-hero').lower(), 'no Picture coming soon on the completion screen')
    pg.screenshot(path=str(SHOTS / 'm-11-continent-done.png'))
    pg.reload(); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.save.doneContinents.indexOf('oceania')>=0"), 'continent completion persists after reload')
    pg.screenshot(path=str(SHOTS / 'm-12-title-progress.png'))
    pg.click('#b-atlas'); pg.wait_for_timeout(150); pg.screenshot(path=str(SHOTS / 'm-13-atlas.png')); pg.click('#ov-atlas #b-close')
    # v1 save compatibility
    pg.evaluate("localStorage.setItem('glow-globe-v1',JSON.stringify({v:1,sound:true,tutorial:1,hints:{},currentContinent:'africa',currentRegion:'ke',partial:{ke:[]},doneRegions:['eg'],doneContinents:[]}))")
    pg.reload(); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.save.doneRegions.join()") == 'eg', 'v1 save is loaded (backward compatible)')
    pg.evaluate("localStorage.setItem('glow-globe-v1','{broken')"); pg.reload(); pg.wait_for_timeout(200)
    ok(pg.evaluate("S.save.doneRegions.length") == 0, 'corrupt save falls back to a fresh game')
    b.close()

    # ---------------- desktop ----------------
    b, ctx, pg = new_page(p, 1280, 720, False)
    pg.screenshot(path=str(SHOTS / 'd-01-title.png'))
    geometry_checks(pg, False, 'desktop 1280x720')
    pg.reload(); pg.wait_for_timeout(200)
    pg.click('#b-play'); pg.wait_for_timeout(250)
    pg.screenshot(path=str(SHOTS / 'd-02-play-tutorial.png'))
    for rid, shot in [('uk', 'd-03-card.png'), ('th', None), ('za', None), ('cu', None), ('br', None), ('nz', None)]:
        play_region(pg, False, rid, shot, mid_shot='d-04-playing.png' if rid == 'th' else None)
    pg.reload(); pg.wait_for_timeout(200)
    ok(pg.evaluate("S.save.doneRegions.length") == 6, 'desktop: six levels persisted after reload')
    pg.evaluate("S.regId='cn';enterPlay();"); pg.wait_for_timeout(300); pg.screenshot(path=str(SHOTS / 'd-05-china.png'))
    pg.evaluate("S.regId='jm';enterPlay();"); pg.wait_for_timeout(300); pg.screenshot(path=str(SHOTS / 'd-06-jamaica.png'))
    b.close()

print('\nConsole/page errors:', len(errors))
for e in errors: print('  ', e)
ok(len(errors) == 0, 'no console errors or warnings, no failed requests')
print('\nRESULT:', 'ALL PASSED' if not fails else f'{len(fails)} FAILED')
sys.exit(1 if fails else 0)
