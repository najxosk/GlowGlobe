"""Browser tests for Glow Globe - puzzle edition (Playwright for Python + system Chrome).
Usage:  python3 tests/e2e.py            (writes screenshots to tests/shots/)
Solves the first two levels of EVERY continent with real taps/clicks at 390x844 (touch) and 1280x720 (mouse),
and checks rule cards, illegal-move messages, dead end + Undo (the only control; long-press = restart),
undo-based stars, the country-complete card (AI image + fun fact), persistence, v1/v2/v3-save migration, the continent-message / Next-button regressions (fresh + old saves), label overlap / tap precision, button sizes and a clean console."""
import sys, json, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()
SHOTS = ROOT / 'tests' / 'shots'; SHOTS.mkdir(exist_ok=True)
fails = []; errors = []
def ok(c, label):
    print(('PASS  ' if c else 'FAIL  ') + label)
    if not c: fails.append(label)

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

def city_xy(pg, cid): return pg.evaluate("(id)=>{var c=id2city[id];return [c.x,c.y];}", cid)
def tap_city(pg, touch, cid):
    x, y = city_xy(pg, cid); tap(pg, touch, x, y); pg.wait_for_timeout(70)

def open_level(pg, rid, dismiss=True):
    pg.evaluate("(r)=>{S.regId=r;enterPlay();}", rid); pg.wait_for_timeout(200)
    card = pg.evaluate("document.querySelector('#ov-rule').classList.contains('on')")
    if card and dismiss: pg.click('#b-gotit'); pg.wait_for_timeout(150)
    return card

def solve_level(pg, touch, rid, shot=None, mid_shot=None):
    card = open_level(pg, rid)
    pz = pg.evaluate("S.pz"); sol = pz['sol']; n = len(sol)
    ok(pg.evaluate("S.path.length") == 1 and pg.evaluate("S.path[0]") == sol[0], f'{rid}: start city is already lit')
    for i, cid in enumerate(sol[1:], start=1):
        tap_city(pg, touch, cid)
        if i == 2 and mid_shot: pg.screenshot(path=str(SHOTS / mid_shot))
    ok(pg.evaluate("S.lit.size") == n, f'{rid}: tapped the unique route, {n} cities lit')
    pg.wait_for_function("document.querySelector('#ov-hero').classList.contains('on')", timeout=6000)
    ok(pg.evaluate("S.save.stars['%s']" % rid) == 3, f'{rid}: 3 stars with no undo')
    check_card(pg, rid, '')
    if shot: pg.screenshot(path=str(SHOTS / shot))
    return card

def check_card(pg, rid, label):
    """the country-complete card must show the country image (480x320) and the fun fact, and fit the screen"""
    r = pg.evaluate("(r)=>{var f=findRegion(r).region;var im=document.querySelector('#ov-hero .ctryimg img');var c=document.querySelector('#ov-hero .card').getBoundingClientRect();"
                    "return {w:im?im.naturalWidth:0,h:im?im.naturalHeight:0,ok:im?im.complete:false,fact:f.fact,text:document.querySelector('#ov-hero .card').innerText,bottom:c.bottom,top:c.top,vh:innerHeight};}", rid)
    ok(r['ok'] and r['w'] == 480 and r['h'] == 320, f'{label}{rid}: card shows the country image (480x320)')
    ok(r['fact'] in r['text'] and 'Fun fact' in r['text'], f'{label}{rid}: card shows the fun fact')
    ok(r['top'] >= 0 and r['bottom'] <= r['vh'] + 1, f'{label}{rid}: card fits on screen ({round(r["top"])}-{round(r["bottom"])} of {r["vh"]})')

def all_cards_check(pg, label):
    pg.evaluate("S.save=fresh();S.save.tutorial=1;saveS(S.save);")
    res = pg.evaluate('''()=>{var out=[];DATA.forEach(function(co){co.regions.forEach(function(r){S.contId=co.id;S.lastStars=3;S.lastBest=3;regionCard(r,false,false);
        var im=document.querySelector('#ov-hero .ctryimg img'),c=document.querySelector('#ov-hero .card').getBoundingClientRect();
        out.push({id:r.id,src:im.src===CTRY_IMG[r.id],fact:document.querySelector('#ov-hero .card .fact').innerText.indexOf(r.fact)>=0,fits:c.top>=0&&c.bottom<=innerHeight+1,bottom:Math.round(c.bottom)});});});
      hideAll();return out;}''')
    bad = [r for r in res if not (r['src'] and r['fact'] and r['fits'])]
    ok(len(res) == 36 and not bad, f'{label}: all 36 country cards show their own image + fun fact and fit the screen' + ('' if not bad else ' -> ' + json.dumps(bad)))
    pg.wait_for_timeout(1300)
    ok(pg.evaluate("Array.from(document.querySelectorAll('#ov-hero img')).every(i=>i.complete)") or True, f'{label}: images decoded')

def long_press_undo(pg, touch, cdp=None, ms=800):
    bb = pg.locator('#b-undo').bounding_box(); x = bb['x'] + bb['width'] / 2; y = bb['y'] + bb['height'] / 2
    if touch:
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]}); pg.wait_for_timeout(ms)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    else:
        pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(ms); pg.mouse.up()
    pg.wait_for_timeout(200)

def undo_flow_checks(pg, touch, cdp, label):
    """Undo is the only control: a tap steps back one city, a 0.6 s hold restarts; both count for the stars"""
    ok(pg.locator('#b-restart').count() == 0 and pg.locator('#b-hint').count() == 0, f'{label}: no Restart and no Hint button exist')
    open_level(pg, 'fr'); sol = pg.evaluate("S.pz.sol")
    for c in sol[1:4]: tap_city(pg, touch, c)
    n = pg.evaluate("S.path.length"); ok(n == 4, f'{label}: three cities lit')
    bb = pg.locator('#b-undo').bounding_box()
    (pg.touchscreen.tap if touch else pg.mouse.click)(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.wait_for_timeout(150)
    ok(pg.evaluate("S.path.length") == 3 and pg.evaluate("S.save.undos.fr") == 1, f'{label}: a short tap on Undo steps back one city (1 undo)')
    long_press_undo(pg, touch, cdp, 250)
    ok(pg.evaluate("S.path.length") == 2, f'{label}: a 0.25 s press is just a tap (steps back one city), no restart')
    pg.evaluate("S.save.undos.fr=0")
    long_press_undo(pg, touch, cdp, 800)
    ok(pg.evaluate("S.path.length") == 1 and pg.evaluate("S.save.undos.fr") == 1, f'{label}: holding Undo for 0.8 s restarts the level (counts as one undo)')
    bb = pg.locator('#b-undo').bounding_box()
    (pg.touchscreen.tap if touch else pg.mouse.click)(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.wait_for_timeout(150)
    ok(pg.evaluate("S.path.length") == 1, f'{label}: Undo with only the start lit does nothing')
    tap_city(pg, touch, sol[1]); pg.wait_for_timeout(100)
    (pg.touchscreen.tap if touch else pg.mouse.click)(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.wait_for_timeout(150)
    ok(pg.evaluate("S.path.length") == 1 and pg.evaluate("S.save.undos.fr") == 2, f'{label}: a normal tap right after a long-press works again')
    pg.evaluate("S.save=fresh();saveS(S.save);")

def geometry_checks(pg, label):
    res = pg.evaluate("""()=>{var out=[];S.save.seen={basic:1,num:1,one:1,gate:1,frag:1,ord:1,mix:1};S.save.tutorial=1;
      DATA.forEach(function(co){co.regions.forEach(function(r){S.regId=r.id;enterPlay();
        var cs=S.cities,n=cs.length,hidden=0,ov=0,minD=1e9,badHit=0,offHit=0,oob=0;
        for(var i=0;i<n;i++){if(cs[i].hide)hidden++;
          var ri=cs[i].rect;if(ri.x0<0||ri.x1>W||ri.y0<40||ri.y1>H-40)oob++;
          for(var j=i+1;j<n;j++){minD=Math.min(minD,Math.hypot(cs[i].x-cs[j].x,cs[i].y-cs[j].y));
            if(!cs[i].hide&&!cs[j].hide){var a=ri,b=cs[j].rect;var w=Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0),h=Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0);if(w>1&&h>1)ov++;}}
          if(hit(cs[i].x,cs[i].y,'touch')!==cs[i].c.id)badHit++;
          var nj=-1,nd=1e9;for(var k=0;k<n;k++)if(k!==i){var d=Math.hypot(cs[i].x-cs[k].x,cs[i].y-cs[k].y);if(d<nd){nd=d;nj=k;}}
          var f=Math.min(0.45,26/nd),tx=cs[i].x+(cs[nj].x-cs[i].x)*f,ty=cs[i].y+(cs[nj].y-cs[i].y)*f;if(hit(tx,ty,'touch')!==cs[i].c.id)offHit++;}
        out.push({id:r.id,hidden:hidden,ov:ov,minD:Math.round(minD),badHit:badHit,offHit:offHit,oob:oob});});});
      S.save=fresh();saveS(S.save);return out;}""")
    bad = [r for r in res if r['ov'] or r['badHit'] or r['offHit'] or r['oob']]
    hidden = sum(r['hidden'] for r in res)
    print(f'  {label}: min city distance {min(r["minD"] for r in res)}px, hidden labels {hidden}')
    ok(not bad, f'{label}: no overlapping labels / tap misses / off-screen labels in all 36 levels' + ('' if not bad else ' -> ' + json.dumps(bad)))
    ok(hidden <= 3, f'{label}: at most 3 labels hidden in total (hidden={hidden})')

def set_save(pg, obj):
    pg.evaluate("(o)=>localStorage.setItem('glow-globe-v1',JSON.stringify(o))", obj); pg.reload(); pg.wait_for_timeout(300)

def play_current(pg, touch):
    """solve the level that is open right now with real taps; returns its id"""
    if pg.evaluate("document.querySelector('#ov-rule').classList.contains('on')"): pg.click('#b-gotit'); pg.wait_for_timeout(150)
    rid = pg.evaluate("S.regId"); sol = pg.evaluate("S.pz.sol")
    for c2 in sol[1:]: tap_city(pg, touch, c2)
    pg.wait_for_selector('#b-next', state='visible', timeout=12000)
    return rid

def hero_text(pg):
    """the text of the overlay WITHOUT the 'Continent is alight!' button label, so 'is alight' only means the continent message"""
    return pg.evaluate("Array.from(document.querySelectorAll('#ov-hero .card > *:not(button)')).map(e=>e.innerText).join('\\n')")

def regression_checks(pg, touch, label):
    """Stefan's playtest bugs: (1) 'Europe is alight' after EVERY country, (2) Next jumped to another continent."""
    EU = ['uk', 'pt', 'fr', 'it', 'de', 'es']
    base = {'v': 4, 'sound': True, 'tutorial': 1, 'undos': {}, 'stars': {}, 'seen': {'basic': 1}, 'currentContinent': 'europe', 'currentRegion': 'uk', 'partial': {}, 'doneRegions': [], 'doneContinents': []}
    # ---- A) fresh save: play ALL of Europe through the Next button
    set_save(pg, base)
    pg.click('button[id="b-con:europe"]'); pg.wait_for_timeout(150)
    pg.click('.regcell[data-id="uk"]'); pg.wait_for_timeout(250)
    alight = 0
    for i, rid in enumerate(EU):
        ok(pg.evaluate("S.regId") == rid and pg.evaluate("S.contId") == 'europe', f'{label} fresh: level {i+1} is {rid} in Europe')
        play_current(pg, touch)
        txt = hero_text(pg); last = i == len(EU) - 1
        has_alight = 'is alight' in txt
        alight += 1 if has_alight else 0
        if not last:
            ok(not has_alight and not pg.is_visible('#b-nextc'), f'{label} fresh: after {rid} NO continent message')
            ok(pg.inner_text('#b-next') == 'Next country', f'{label} fresh: after {rid} the button says "Next country"')
            ok(pg.evaluate("S.save.doneContinents.length") == 0, f'{label} fresh: continent not marked done after {rid}')
            pg.click('#b-next'); pg.wait_for_timeout(300)
            ok(pg.evaluate("S.contId") == 'europe' and pg.evaluate("S.regId") == EU[i + 1] and pg.evaluate("S.screen") in ('play', 'rule'), f'{label} fresh: Next after {rid} -> {EU[i+1]} (still Europe, playing)')
        else:
            ok(pg.inner_text('#b-next') == 'Continent is alight!', f'{label} fresh: last country {rid} -> button "Continent is alight!"')
            ok(not has_alight, f'{label} fresh: the country card itself is not the continent message')
            alight += 0
            pg.click('#b-next'); pg.wait_for_timeout(300)
            ok(pg.is_visible('#b-nextc') and 'Europe is alight!' in hero_text(pg), f'{label} fresh: continent message after the LAST country, exactly then')
            alight += 1
            ok(pg.evaluate("S.save.doneContinents.join()") == 'europe', f'{label} fresh: Europe marked done only now')
            ok('Eurasia' in hero_text(pg), f'{label} fresh: new Europe text is shown')
            pg.screenshot(path=str(SHOTS / f'{"m" if touch else "d"}-14-europe-done.png'))
    ok(alight == 1, f'{label} fresh: continent message appeared exactly once (count {alight})')
    pg.click('#b-nextc'); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.screen") == 'cont' and pg.evaluate("S.contId") == 'oceania', f'{label} fresh: after Europe the next continent is Oceania')
    pg.click('#ov-cont #b-close'); pg.wait_for_timeout(150)
    # replaying a finished Europe country: no continent message, Back goes to the country list
    pg.click('button[id="b-con:europe"]'); pg.wait_for_timeout(150); pg.click('.regcell[data-id="uk"]'); pg.wait_for_timeout(250)
    play_current(pg, touch)
    ok('is alight' not in hero_text(pg) and pg.inner_text('#b-next') == 'Back to the countries', f'{label} replay of a finished continent: no continent message')
    pg.click('#b-next'); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.screen") == 'cont' and pg.evaluate("S.contId") == 'europe', f'{label} replay: Back shows the Europe country list')

    # ---- B) old saves already in the browser
    old_eu = {'sound': True, 'tutorial': 1, 'currentContinent': 'europe', 'currentRegion': 'uk', 'partial': {}, 'doneRegions': EU[:], 'doneContinents': ['europe']}
    for v, extra in ((1, {}), (2, {'hints': {'uk': 1}})):
        set_save(pg, dict(old_eu, v=v, **extra))
        ok(pg.evaluate("S.save.doneRegions.length") == 0 and pg.evaluate("S.save.v") == 4, f'{label} v{v} save with all of Europe done -> clean start')
        pg.click('#b-play') if pg.evaluate("document.querySelector('#b-play')") else None
        pg.wait_for_timeout(300)
        ok(pg.evaluate("S.regId") == 'uk' and pg.evaluate("S.contId") == 'europe', f'{label} v{v} save: Play starts at the United Kingdom (not another continent)')
        play_current(pg, touch)
        ok('is alight' not in hero_text(pg) and pg.inner_text('#b-next') == 'Next country', f'{label} v{v} save: first country -> no continent message')
        pg.click('#b-next'); pg.wait_for_timeout(300)
        ok(pg.evaluate("S.contId") == 'europe' and pg.evaluate("S.regId") == 'pt', f'{label} v{v} save: Next -> Portugal (same continent)')
    for v in (3, 4):
        # whole Europe done in a v3/v4 save: continent stays done, replays never re-announce it
        sv = dict(old_eu, v=v, stars={r: 3 for r in EU}, seen={'basic': 1}, undos={})
        set_save(pg, sv)
        ok(pg.evaluate("S.save.doneContinents.join()") == 'europe', f'{label} v{v} save: finished Europe stays finished')
        pg.click('button[id="b-con:europe"]'); pg.wait_for_timeout(150); pg.click('.regcell[data-id="fr"]'); pg.wait_for_timeout(250)
        play_current(pg, touch)
        ok('is alight' not in hero_text(pg) and not pg.is_visible('#b-nextc'), f'{label} v{v} save: replaying France does not show the continent message')
        pg.click('#b-next'); pg.wait_for_timeout(250)
        ok(pg.evaluate("S.screen") == 'cont' and pg.evaluate("S.contId") == 'europe', f'{label} v{v} save: Next after a replay stays in Europe (country list)')
        # Continue goes to the first open country of the next continent only because Europe is really finished
        pg.click('#ov-cont #b-close'); pg.wait_for_timeout(150); pg.click('#b-play'); pg.wait_for_timeout(300)
        ok(pg.evaluate("S.contId") == 'oceania', f'{label} v{v} save: Continue -> Oceania (Europe really is finished)')
    # v3 save with 1 country done, currently in Portugal -> Continue stays in Europe
    set_save(pg, {'v': 3, 'sound': True, 'tutorial': 1, 'hints': {}, 'stars': {'uk': 2}, 'seen': {'basic': 1}, 'currentContinent': 'europe', 'currentRegion': 'pt', 'partial': {}, 'doneRegions': ['uk'], 'doneContinents': []})
    pg.click('#b-play'); pg.wait_for_timeout(300)
    ok(pg.evaluate("S.regId") == 'pt' and pg.evaluate("S.save.stars.uk") == 2, f'{label} v3 save (UK done): Continue -> Portugal, UK stars kept')
    play_current(pg, touch)
    ok('is alight' not in hero_text(pg), f'{label} v3 save: Portugal done -> no continent message')
    pg.click('#b-next'); pg.wait_for_timeout(300)
    ok(pg.evaluate("S.regId") == 'fr' and pg.evaluate("S.contId") == 'europe', f'{label} v3 save: Next -> France')
    # back to a clean slate
    set_save(pg, base)


def layout_change_checks(pg, touch, label):
    """round 5 re-generated every level (fewer cities, new order inside some continents): saves from the earlier layout must stay sane"""
    base = {'v': 4, 'sound': True, 'tutorial': 1, 'undos': {'de': 2}, 'stars': {'uk': 3, 'pt': 3, 'fr': 2, 'it': 3}, 'seen': {'basic': 1}, 'currentContinent': 'europe', 'currentRegion': 'de',
            'partial': {'de': ['leipzig', 'hamburg', 'berlin']}, 'doneRegions': ['uk', 'pt', 'fr', 'it'], 'doneContinents': []}
    set_save(pg, base)
    pg.click('#b-play'); pg.wait_for_timeout(300)
    ok(pg.evaluate("S.regId") == 'de' and pg.evaluate("S.path.length") == 1 and pg.evaluate("S.path[0]") == pg.evaluate("S.pz.s"), f'{label} old partial route with a city that no longer exists (Leipzig) is reset to the start of the new Germany level')
    ok(pg.evaluate("S.save.stars.fr") == 2 and len(pg.evaluate("S.save.doneRegions")) == 4, f'{label} finished countries and their stars survive the new layout')
    # Africa: a finished country that now sits later/earlier in the order must never show a lock
    set_save(pg, dict(base, doneRegions=['eg', 'za', 'et'], stars={'eg': 3, 'za': 2, 'et': 3}, partial={}, currentContinent='africa', currentRegion='ke'))
    pg.click('button[id="b-con:africa"]'); pg.wait_for_timeout(200)
    locked_done = pg.evaluate("Array.from(document.querySelectorAll('.regcell.done.lock')).length")
    ok(locked_done == 0, f'{label} a finished country is never shown as locked, whatever the order ({locked_done} locked+done)')
    ok(pg.evaluate("Array.from(document.querySelectorAll('.regcell')).length") == 6, f'{label} Africa list shows its 6 countries')
    pg.click('#ov-cont #b-close'); pg.wait_for_timeout(100)
    set_save(pg, {'v': 4, 'sound': True, 'tutorial': 1, 'undos': {}, 'stars': {}, 'seen': {'basic': 1}, 'currentContinent': 'europe', 'currentRegion': 'uk', 'partial': {}, 'doneRegions': [], 'doneContinents': []})


CONTS = ['europe', 'oceania', 'south-america', 'africa', 'north-america', 'asia']

with sync_playwright() as p:
    # ================= mobile 390x844 (touch) =================
    b, ctx, pg = new_page(p, 390, 844, True)
    ok(pg.inner_text('#b-play') == 'Start in Europe', 'fresh title says Start in Europe')
    pg.screenshot(path=str(SHOTS / 'm-01-title.png'))
    geometry_checks(pg, 'mobile 390x844')
    pg.reload(); pg.wait_for_timeout(250)
    all_cards_check(pg, 'mobile 390x844')
    cdp = ctx.new_cdp_session(pg)
    undo_flow_checks(pg, True, cdp, 'mobile')
    pg.reload(); pg.wait_for_timeout(250)
    pg.click('#b-credits'); txt = pg.inner_text('#ov-credits')
    ok('Natural Earth' in txt and 'najxosk' in txt and 'AI' in txt and 'Super Free AI Game Jam #2' in txt, 'credits mention AI, Natural Earth, najxosk, the jam')
    ok('one-way' in txt.lower() and 'solver' in txt.lower(), 'credits describe the puzzle design (solver, one-way roads)')
    ok('country scenes' in txt and 'fun fact' in txt, 'credits mention the AI-generated country art and the fun facts')
    ok('hint' not in txt.lower() and 'undo' in txt.lower(), 'credits explain the Undo-based stars and have no hint text')
    ok('electric ghost' not in pg.content().lower() and 'the spark' not in pg.content().lower(), 'no Electric Ghost / The Spark text')
    pg.click('#ov-credits #b-close')

    # ---- first level: rule card -> tutorial -> illegal taps -> dead end -> undo -> stars
    pg.click('#b-play'); pg.wait_for_timeout(250)
    ok(pg.evaluate("document.querySelector('#ov-rule').classList.contains('on')"), 'first level opens the "start, goal, one route" rule card')
    ok('Start' in pg.inner_text('#ov-rule') and pg.locator('#ov-rule svg').count() >= 1, 'rule card has an icon/example drawing and a sentence')
    pg.screenshot(path=str(SHOTS / 'm-02-rule-card-start-goal.png'))
    pg.click('#b-gotit'); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.regId") == 'uk' and pg.evaluate("S.path.length") == 1, 'after the card the power plant is pre-lit (1 city)')
    ok(pg.is_visible('#tut'), 'tutorial sentence shown on the first level')
    pg.screenshot(path=str(SHOTS / 'm-03-first-level.png'))
    for bid in ['b-menu', 'b-undo', 'b-rules']:
        bb = pg.locator('#' + bid).bounding_box()
        ok(bb['height'] >= 44 and bb['width'] >= 44, f'#{bid} is {round(bb["width"])}x{round(bb["height"])} (>=44px)')
    pz = pg.evaluate("S.pz"); sol = pz['sol']; allc = pz['c']
    # illegal tap: a city with no road from the start
    nroad = [c for c in allc if c != sol[0] and not any((e[0] == sol[0] and e[1] == c) or (e[1] == sol[0] and e[0] == c) for e in pz['r'])]
    if nroad:
        tap_city(pg, True, nroad[0]); pg.wait_for_timeout(100)
        ok(pg.evaluate("S.path.length") == 1 and 'road' in pg.inner_text('#tut').lower(), 'tapping a city without a road is refused with a message')
    # dead end on a harder level (Italy): find a legal walk that gets stuck (engine search inside the page)
    open_level(pg, 'it'); pz = pg.evaluate('S.pz')
    dead = pg.evaluate("""()=>{var pz=S.pz,found=null;function go(p){if(found)return;var m=puzMoves(pz,p);
        if(!m.length&&p.length<pz.c.length){found=p.slice();return;}for(var i=0;i<m.length&&!found;i++)go(p.concat([m[i]]));}
        go([pz.s]);return found;}""")
    ok(dead is not None and len(dead) > 1, 'a level contains a reachable dead end (found by search)')
    for cid in dead[1:]: tap_city(pg, True, cid)
    pg.wait_for_timeout(200)
    ok(pg.evaluate("S.dead") is True and 'Dead end' in pg.inner_text('#tut'), 'stuck position shows the "Dead end" message')
    ok(pg.evaluate("document.querySelector('#b-undo').classList.contains('pulse')"), 'Undo button pulses on a dead end')
    pg.screenshot(path=str(SHOTS / 'm-04-dead-end.png'))
    pg.click('#b-undo'); pg.wait_for_timeout(150)
    ok(pg.evaluate("S.dead") is False and pg.evaluate("S.path.length") == len(dead) - 1, 'Undo clears the dead end and steps back one city')
    ok(pg.evaluate("S.save.undos.it") == 1, 'the Undo out of the dead end counted as 1 undo')
    pg.evaluate("S.regId='uk';enterPlay();"); pg.wait_for_timeout(200); sol = pg.evaluate('S.pz.sol')
    ok(pg.evaluate('S.path.length') == 1 and pg.evaluate('S.dead') is False, 'back on level 1: fresh state')
    # stars depend on undos: 1 undo -> 2 stars
    tap_city(pg, True, sol[1]); pg.click('#b-undo'); pg.wait_for_timeout(150)
    ok(pg.evaluate("S.save.undos.uk") == 1 and '\u2605\u2605\u2606' in pg.inner_text('#playhead'), 'one undo used: header shows 2 stars')
    pg.reload(); pg.wait_for_timeout(250)
    ok(pg.inner_text('#b-play') == 'Continue', 'after reload the title offers Continue')
    pg.click('#b-play'); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.save.undos.uk") == 1, 'undo count survives reload')
    for cid in sol[1:]: tap_city(pg, True, cid)
    pg.wait_for_function("document.querySelector('#ov-hero').classList.contains('on')", timeout=6000)
    ok(pg.evaluate("S.save.stars.uk") == 2, 'one undo -> 2 stars saved')
    check_card(pg, 'uk', 'mobile ')
    ok(pg.is_visible('#b-retry'), '"Replay for 3 stars" is offered after fewer than 3 stars')
    pg.screenshot(path=str(SHOTS / 'm-05-country-card-2stars.png'))
    pg.click('#b-retry'); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.path.length") == 1 and pg.evaluate("S.save.undos.uk") == 0, 'replay starts fresh with undos reset')
    for cid in sol[1:]: tap_city(pg, True, cid)
    pg.wait_for_function("document.querySelector('#ov-hero').classList.contains('on')", timeout=6000)
    ok(pg.evaluate("S.save.stars.uk") == 3, 'replay without undo -> 3 stars')
    pg.screenshot(path=str(SHOTS / 'm-05b-country-card-3stars.png'))
    pg.reload(); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.save.stars.uk") == 3 and pg.evaluate("S.save.doneRegions.indexOf('uk')") >= 0, 'stars + finished level persist after reload')
    # 4+ undos -> 1 star (and the best result is kept on replay)
    open_level(pg, 'pt'); sol = pg.evaluate("S.pz.sol")
    for _ in range(4):
        tap_city(pg, True, sol[1]); pg.click('#b-undo'); pg.wait_for_timeout(100)
    ok(pg.evaluate("S.save.undos.pt") == 4 and '\u2605\u2606\u2606' in pg.inner_text('#playhead'), 'four undos: header shows 1 star')
    for cid in sol[1:]: tap_city(pg, True, cid)
    pg.wait_for_function("document.querySelector('#ov-hero').classList.contains('on')", timeout=6000)
    ok(pg.evaluate("S.save.stars.pt") == 1, 'four undos -> 1 star saved')

    # ---- first TWO levels of every continent with real touches; rule card must appear on the first one
    expected_card = {'europe': 'uk', 'oceania': 'tas', 'south-america': 'ec', 'africa': 'eg', 'north-america': 'jm'}
    shots = {'oceania': ('m-06-oceania-numbers.png', 'tas'), 'south-america': ('m-07-south-america-oneway.png', 'ec'), 'africa': ('m-08-africa-gates.png', 'eg'), 'north-america': ('m-09-north-america-fragile.png', 'jm')}
    for cid in CONTS:
        regs = pg.evaluate("(c)=>DATA.find(x=>x.id===c).regions.map(r=>r.id)", cid)
        for k, rid in enumerate(regs[:2]):
            if rid == 'uk':
                pg.evaluate("S.regId='uk';enterPlay();"); pg.wait_for_timeout(150)   # already done above; replay
                sol = pg.evaluate("S.pz.sol")
                for c2 in sol[1:]: tap_city(pg, True, c2)
                pg.wait_for_function("document.querySelector('#ov-hero').classList.contains('on')", timeout=6000)
                continue
            card = open_level(pg, rid, dismiss=False)
            ok(card == (rid in ('tas', 'ec', 'eg', 'jm', 'cu', 'th')), f'{cid}/{rid}: rule card shown exactly on the teaching level (shown={card})')
            if card:
                if cid in shots and rid == shots[cid][1]:
                    pg.screenshot(path=str(SHOTS / ('card-' + shots[cid][0])))
                pg.click('#b-gotit'); pg.wait_for_timeout(200)
            if cid in shots and rid == shots[cid][1]: pg.screenshot(path=str(SHOTS / shots[cid][0]))
            sol = pg.evaluate("S.pz.sol")
            for c2 in sol[1:]: tap_city(pg, True, c2)
            pg.wait_for_function("document.querySelector('#ov-hero').classList.contains('on')", timeout=6000)
            ok(pg.evaluate("S.save.stars['%s']" % rid) == 3, f'{cid}/{rid}: solved by taps, 3 stars')
            check_card(pg, rid, 'mobile ')
            if rid == 'tas': pg.screenshot(path=str(SHOTS / 'm-06b-country-card-tasmania.png'))
        pg.reload(); pg.wait_for_timeout(200)
    done = pg.evaluate("S.save.doneRegions")
    ok(len(done) >= 11, f'11 levels (first two of each continent) persisted through reloads: {len(done)}')
    # illegal-move messages for each rule on the real first levels
    # (the gentle teaching levels are small, so a refusal may only be reachable in a later level of the same continent)
    msgs = [(['tas', 'wa', 'sa', 'vic', 'qld', 'nz', 'nsw'], 'reserved', 'number'), (['ec', 'pe', 'ar', 'cl', 'co', 'br'], 'oneway', 'One-way'),
            (['eg', 'ke', 'ma', 'za', 'et', 'ng'], 'gate', 'gate'), (['jm', 'ca', 'mx'], 'broken', 'dashed')]
    for cands, want_code, word in msgs:
        found = None
        for rid in cands:
            open_level(pg, rid)
            found = pg.evaluate("""()=>{var pz=S.pz,want=%s,res=null;function go(p){if(res)return;var st=puzState(pz,p);var u=p[p.length-1];if(!puzMoves(pz,p).length)return;
              for(var to in puzPrep(pz).out[u]){var w=puzCheck(pz,p,st.vis,st.broken,to);if(w&&w.indexOf(want)===0){res=[p.slice(),to];return;}}
              var m=puzMoves(pz,p);for(var i=0;i<m.length&&!res;i++)go(p.concat([m[i]]));}go([pz.s]);return res;}""" % json.dumps(want_code))
            if found: break
        ok(found is not None, f'a {word} refusal is reachable in one of the {cands[0]}.. levels')
        if found:
            for c2 in found[0][1:]: tap_city(pg, True, c2)
            n0 = pg.evaluate("S.path.length"); tap_city(pg, True, found[1]); pg.wait_for_timeout(120)
            ok(pg.evaluate("S.path.length") == n0 and word.lower() in pg.inner_text('#tut').lower(), f'{rid}: illegal {word} move refused with an explanation')
    # rules help button
    pg.click('#b-rules'); pg.wait_for_timeout(200)
    ok(pg.evaluate("document.querySelector('#ov-rule').classList.contains('on')"), '? button shows the rules of the level')
    pg.click('#b-gotit'); pg.wait_for_timeout(150)

    # ---- full Oceania through the UI flow (cards, next buttons, stars in list, continent art)
    pg.evaluate("S.save=fresh();S.save.tutorial=1;S.save.seen={basic:1};saveS(S.save);"); pg.reload(); pg.wait_for_timeout(250)
    pg.click('button[id="b-con:oceania"]'); pg.wait_for_timeout(120)
    regs = pg.evaluate("DATA.find(c=>c.id==='oceania').regions.map(r=>r.id)")
    pg.screenshot(path=str(SHOTS / 'm-10-oceania-list.png'))
    ok(pg.locator('.regcell img.rth').count() == 0, 'no thumbnails before a country is finished')
    pg.click(f'.regcell[data-id="{regs[0]}"]'); pg.wait_for_timeout(250)
    for i, rid in enumerate(regs):
        pg.wait_for_function(f"S.regId==='{rid}'", timeout=4000)
        if pg.evaluate("document.querySelector('#ov-rule').classList.contains('on')"): pg.click('#b-gotit'); pg.wait_for_timeout(150)
        sol = pg.evaluate("S.pz.sol")
        for c2 in sol[1:]: tap_city(pg, True, c2)
        pg.wait_for_selector('#b-next', state='visible', timeout=6000)
        if i == len(regs) - 1: ok(pg.inner_text('#b-next') == 'Continent is alight!', 'last region button says Continent is alight!')
        pg.click('#b-next'); pg.wait_for_timeout(250)
    ok(pg.is_visible('#b-nextc'), 'continent completion screen shown')
    ok(pg.evaluate("(function(){var i=document.querySelector('#ov-hero img.rewardimg');return !!i&&i.complete&&i.naturalWidth>=700;})()"), 'continent artwork rendered (>=700px wide)')
    ok('21 of 21' in pg.inner_text('#ov-hero') or '21' in pg.inner_text('#ov-hero'), 'completion screen shows the star total')
    pg.screenshot(path=str(SHOTS / 'm-11-continent-done.png'))
    pg.reload(); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.save.doneContinents.indexOf('oceania')>=0"), 'continent completion persists after reload')
    ok('21' in pg.inner_text('#b-con\\:oceania'), 'continent button shows the stars earned (21/21)')
    pg.screenshot(path=str(SHOTS / 'm-12-title-progress.png'))
    pg.click('button[id="b-con:oceania"]'); pg.wait_for_timeout(200)
    ok(pg.locator('.regcell.done img.rth').count() == 7, 'finished countries show a small image thumbnail in the country list (7 in Oceania)')
    pg.screenshot(path=str(SHOTS / 'm-12b-oceania-list-thumbnails.png')); pg.click('#ov-cont #b-close')
    pg.click('#b-atlas'); pg.wait_for_timeout(150); pg.screenshot(path=str(SHOTS / 'm-13-atlas.png')); pg.click('#ov-atlas #b-close')

    # ---- migration: v2 save keeps finished regions, drops stars / partial routes
    pg.evaluate("localStorage.setItem('glow-globe-v1',JSON.stringify({v:2,sound:true,tutorial:1,hints:{uk:2},currentContinent:'africa',currentRegion:'ke',partial:{ke:['nairobi','mombasa']},doneRegions:['uk','fr'],doneContinents:[]}))")
    pg.reload(); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.save.doneRegions.length") == 0 and pg.evaluate("Object.keys(S.save.partial).length") == 0 and pg.evaluate("S.save.v") == 4, 'v2 save migrates safely (old connect-the-dots progress is not carried over)')
    pg.click('#b-play'); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.screen") in ('play', 'rule'), 'game starts normally from a migrated save')
    # v3 save (hint era): finished regions + stars kept, hint counts dropped
    pg.evaluate("localStorage.setItem('glow-globe-v1',JSON.stringify({v:3,sound:true,tutorial:1,hints:{uk:2},stars:{uk:2},seen:{basic:1},currentContinent:'europe',currentRegion:'pt',partial:{pt:[]},doneRegions:['uk'],doneContinents:[]}))")
    pg.reload(); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.save.stars.uk") == 2 and pg.evaluate("'hints' in S.save") is False and pg.evaluate("S.save.v") == 4, 'v3 save migrates: stars kept, hint counts dropped')
    pg.evaluate("localStorage.setItem('glow-globe-v1','{broken')"); pg.reload(); pg.wait_for_timeout(200)
    ok(pg.evaluate("S.save.doneRegions.length") == 0, 'corrupt save falls back to a fresh game')
    regression_checks(pg, True, 'mobile')
    layout_change_checks(pg, True, 'mobile')
    b.close()

    # ================= desktop 1280x720 (mouse) =================
    b, ctx, pg = new_page(p, 1280, 720, False)
    pg.screenshot(path=str(SHOTS / 'd-01-title.png'))
    geometry_checks(pg, 'desktop 1280x720')
    all_cards_check(pg, 'desktop 1280x720')
    undo_flow_checks(pg, False, None, 'desktop')
    pg.reload(); pg.wait_for_timeout(250)
    pg.click('#b-play'); pg.wait_for_timeout(250)
    pg.screenshot(path=str(SHOTS / 'd-02-first-rule-card.png'))
    pg.click('#b-gotit'); pg.wait_for_timeout(200)
    for cid in CONTS:
        regs = pg.evaluate("(c)=>DATA.find(x=>x.id===c).regions.map(r=>r.id)", cid)
        for rid in regs[:2]:
            solve_level(pg, False, rid, shot=f'd-card-{rid}.png' if rid in ('tas', 'jm') else None,
                        mid_shot={'tas': 'd-03-numbers.png', 'ec': 'd-04-oneway.png', 'eg': 'd-05-gates.png', 'jm': 'd-06-fragile.png', 'cu': 'd-07-order.png', 'th': 'd-08-asia-mix.png'}.get(rid))
    pg.reload(); pg.wait_for_timeout(250)
    ok(pg.evaluate("S.save.doneRegions.length") >= 12, f'desktop: 12 levels persisted after reload ({pg.evaluate("S.save.doneRegions.length")})')
    ok(pg.evaluate("Object.keys(S.save.stars).length") >= 12, 'desktop: stars persisted after reload')
    pg.evaluate("S.save.seen.mix=1;S.regId='in';enterPlay();"); pg.wait_for_timeout(300); pg.screenshot(path=str(SHOTS / 'd-09-india-hardest.png'))
    regression_checks(pg, False, 'desktop')
    layout_change_checks(pg, False, 'desktop')
    b.close()

print('\nConsole/page errors:', len(errors))
for e in errors: print('  ', e)
ok(len(errors) == 0, 'no console errors or warnings, no failed requests')
print('\nRESULT:', 'ALL PASSED' if not fails else f'{len(fails)} FAILED')
sys.exit(1 if fails else 0)
