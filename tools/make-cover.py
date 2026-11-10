"""Renders itch/cover.png (630x500) from the generated art + a real gameplay screenshot."""
import pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
bg = (ROOT / 'art' / 'asia.webp').as_uri(); shot = (ROOT / 'itch' / 'screenshots' / '11-mobile-country-card-japan.png').as_uri()
html = f"""<html><body style="margin:0;width:630px;height:500px;overflow:hidden;position:relative;background:#050814;font-family:system-ui,'Segoe UI',sans-serif">
<div style="position:absolute;inset:0;background:url({bg}) center/cover;filter:brightness(.8) saturate(1.1)"></div>
<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,8,20,.93) 0%,rgba(5,8,20,.75) 48%,rgba(5,8,20,.1) 100%)"></div>
<div style="position:absolute;left:34px;top:92px;width:330px">
 <div style="font-size:62px;line-height:.98;font-weight:800;color:#ffe7b3;text-shadow:0 0 30px rgba(240,180,41,.75),0 0 4px rgba(240,180,41,.6)">Glow<br>Globe</div>
 <div style="margin-top:16px;font-size:20px;line-height:1.3;color:#e4ebf6">One start, one goal, one perfect route.<br><span style="color:#f0b429">Every country glows with its own scene.</span></div>
 <div style="margin-top:20px;display:inline-block;padding:7px 14px;border:1px solid #8a6416;border-radius:999px;color:#ffe7b3;font-size:14px;background:rgba(7,11,22,.6)">Puzzle &middot; Mobile &amp; PC &middot; No install</div>
</div>
<div style="position:absolute;right:30px;top:42px;width:196px;height:424px;border-radius:30px;border:3px solid #2b3a58;overflow:hidden;box-shadow:0 0 44px rgba(240,180,41,.45);transform:rotate(4deg)"><img src="{shot}" style="width:100%;height:100%;object-fit:cover"></div>
<div style="position:absolute;left:34px;bottom:22px;font-size:12px;color:#9aa6bd">Super Free AI Game Jam #2</div>
</body></html>"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 630, 'height': 500})
    tmp = ROOT / 'tools' / '_cover.html'; tmp.write_text(html, encoding='utf8'); pg.goto(tmp.as_uri()); pg.wait_for_timeout(600)
    pg.screenshot(path=str(ROOT / 'itch' / 'cover.png')); b.close(); tmp.unlink()
print('cover ok')
