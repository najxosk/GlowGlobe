// Glow Globe — generates a single self-contained offline index.html
// Reads source data from the grok-workspace ZIP extract (tmp) and emits index.html.
import fs from "node:fs";
import path from "node:path";

const SRC = process.env.GGW_SRC || "C:/Users/Verdili/AppData/Local/Temp/grok-workspace";
const OUT = process.env.GGW_OUT || "C:/Users/Verdili/Documents/Orca/glow-globe/index.html";

/* ---------- 1. Load places.ts (strip type annotations -> eval) ---------- */
let placesSrc = fs.readFileSync(`${SRC}/src/game/places.ts`, "utf8");
placesSrc = placesSrc
  .replace(/:\s*(Continent\[\]|Region\[\]|City\[\]|string|number|boolean|City|Region|Continent)(?=\s|[,);<=]|$)/g, "")
  .replace(/<\s*[A-Za-z][A-Za-z0-9]*\s*>/g, "")
  .replace(/\bexport\s+(type\s+\w+\s*=\s*\{[\s\S]*?\}\s*;?)/g, "")
  .replace(/\bexport\s+/g, "");
const placesRun = new Function(placesSrc + "; return { continents, CITY_COUNT };");
const { continents, CITY_COUNT } = placesRun();
const REGION_COUNT = continents.reduce((n, c) => n + c.regions.length, 0);
console.log(`cities: ${CITY_COUNT}, regions: ${REGION_COUNT}, continents: ${continents.length}`);

/* ---------- 2. Load shapes.ts (object/array literals) ---------- */
const shapesSrc = fs.readFileSync(`${SRC}/src/game/shapes.ts`, "utf8");

// Find varName, brace-count from the open-bracket after its `=` assignment.
// (robust to `name: Record<string, number[][][]> = {` — skips the type annotation's own brackets).
function extractBrace0(src, varName, open, close) {
  const vi = src.indexOf(varName);
  if (vi < 0) throw new Error("no " + varName);
  let i = vi;
  while (i < src.length && src[i] !== "=") i++;
  if (i >= src.length) throw new Error("no = for " + varName);
  while (i < src.length && src[i] !== open) i++;
  if (i >= src.length) throw new Error("no opening " + open + " for " + varName);
  const start = i;
  let depth = 0;
  do { if (src[i] === open) depth++; else if (src[i] === close) depth--; i++; } while (i < src.length && depth > 0);
  return src.slice(start, i);
}
const regionRingsRaw = JSON.parse(extractBrace0(shapesSrc, "regionRings", "{", "}"));
const landRingsRaw = JSON.parse(extractBrace0(shapesSrc, "landRings", "[", "]"));

/* ---------- 3. Douglas–Peucker simplification ---------- */
function dpDist(a, b, p) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (len * len)));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function simplifyRing(pts, eps) {
  if (pts.length < 4) return pts.slice();
  let worst = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = dpDist(pts[0], pts[pts.length - 1], pts[i]); if (d > worst) { worst = d; idx = i; } }
  if (worst > eps) { const l = simplifyRing(pts.slice(0, idx + 1), eps), r = simplifyRing(pts.slice(idx), eps); return l.slice(0, -1).concat(r); }
  return [pts[0], pts[pts.length - 1]];
}
function simplifyRings(rings, eps) { return rings.map((r) => simplifyRing(r, eps)).filter((r) => r.length >= 3); }

const regionEps = 0.7, landEps = 2.0;
const regionRings = {};
for (const id of Object.keys(regionRingsRaw)) regionRings[id] = simplifyRings(regionRingsRaw[id], regionEps);
const landRings = simplifyRings(landRingsRaw, landEps);
let tr = 0, tl = 0;
Object.values(regionRings).forEach((x) => x.forEach((r) => (tr += r.length)));
landRings.forEach((r) => (tl += r.length));
console.log(`regionRings pts: ${tr}, landRings pts: ${tl}`);

/* ---------- 4. Bbox per region ---------- */
const bbox = {};
for (const id of Object.keys(regionRings)) {
  let ml = 1e9, ML = -1e9, mB = 1e9, MB = -1e9;
  for (const r of regionRings[id]) for (const p of r) { if (p[0] < ml) ml = p[0]; if (p[0] > ML) ML = p[0]; if (p[1] < mB) mB = p[1]; if (p[1] > MB) MB = p[1]; }
  bbox[id] = [ml, ML, mB, MB];
}

/* ---------- 5. Compact JSON of places ---------- */
const placesJson = JSON.stringify(continents.map((c) => ({
  id: c.id, name: c.name, blurb: c.blurb,
  regions: c.regions.map((r) => ({
    id: r.id, name: r.name, capital: r.capital, flag: r.flag, fact: r.fact,
    cities: r.cities.map((c2) => ({ id: c2.id, name: c2.name, lat: c2.lat, lon: c2.lon })),
  })),
})));

const regionsJson = JSON.stringify(regionRings);
const landJson = JSON.stringify(landRings);
const bboxJson = JSON.stringify(bbox);

/* ---------- 6. Game JS (no backticks, no ${ inside) ---------- */
const GAME_JS = String.raw`
'use strict';
/* Map data: Natural Earth, public domain. Simplified (Douglas-Peucker). */
var DATA = __PLACES__;
var REGION_COUNT = DATA.reduce(function(n,c){return n+c.regions.length;},0);
var RINGS = __REGIONS__;
var LAND = __LAND__;
var BBOX = __BBOX__;

function $(s){return document.querySelector(s);}
var TAU=Math.PI*2;
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v));};
var canvas=$('#cv'), ctx=canvas.getContext('2d');
var W=innerWidth,H=innerHeight,DPR=Math.min(2,(window.devicePixelRatio||1));
function cw(){DPR=Math.min(2,(window.devicePixelRatio||1));}
function resize(){cw();canvas.width=innerWidth*DPR;canvas.height=innerHeight*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';}
addEventListener('resize',function(){W=innerWidth;H=innerHeight;resize();});
resize();

function findContinent(id){for(var i=0;i<DATA.length;i++)if(DATA[i].id===id)return DATA[i];return null;}
function findRegion(id){for(var i=0;i<DATA.length;i++){for(var j=0;j<DATA[i].regions.length;j++){if(DATA[i].regions[j].id===id)return{continent:DATA[i],region:DATA[i].regions[j]};}}return null;}

/* ---- camera ---- */
function cameraFromBox(box,w,h,ins){
  var mean=(box.minLat+box.maxLat)/2;var cosx=Math.max(0.35,Math.cos(mean*Math.PI/180));
  var worldW=Math.max(0.8,box.maxLon-box.minLon);var worldH=Math.max(0.8,(box.maxLat-box.minLat)*cosx);
  var aw=Math.max(40,w-ins.left-ins.right);var ah=Math.max(40,h-ins.top-ins.bottom);
  var scale=Math.min(aw/worldW,ah/worldH);
  return{minLon:box.minLon,maxLon:box.maxLon,minLat:box.minLat,maxLat:box.maxLat,cos:cosx,scale:scale,ox:ins.left+(aw-worldW*scale)/2,oy:ins.top+(ah-worldH*scale)/2,north:box.maxLat*cosx};}
function project(cam,lon,lat){return{x:cam.ox+(lon-cam.minLon)*cam.scale,y:cam.oy+(cam.north-lat*cam.cos)*cam.scale};}
function cameraForRegion(region,w,h,ins){var ml=1e9,ML=-1e9,mB=1e9,MB=-1e9;
  for(var i=0;i<region.cities.length;i++){var bb=BBOX[region.cities[i].id];if(!bb)continue;
    if(bb[0]<ml)ml=bb[0];if(bb[1]>ML)ML=bb[1];if(bb[2]<mB)mB=bb[2];if(bb[3]>MB)MB=bb[3];}
  var sl=Math.max(2.4,ML-ml),sb=Math.max(1.8,MB-mB);
  return cameraFromBox({minLon:ml-sl*0.5,maxLon:ML+sl*0.5,minLat:mB-sb*0.55,maxLat:MB+sb*0.55},w,h,ins);}
function worldCamera(w,h,ins){return cameraFromBox({minLon:-170,maxLon:194,minLat:-52,maxLat:76},w,h,ins);}
function ringsCamera(rings,w,h,ins){var ml=1e9,ML=-1e9,mB=1e9,MB=-1e9;
  for(var a=0;a<rings.length;a++)for(var b2=0;b2<rings[a].length;b2++){var p=rings[a][b2];if(p[0]<ml)ml=p[0];if(p[0]>ML)ML=p[0];if(p[1]<mB)mB=p[1];if(p[1]>MB)MB=p[1];}
  if(!isFinite(ml))return worldCamera(w,h,ins);
  return cameraFromBox({minLon:ml-1,maxLon:ML+1,minLat:mB-1,maxLat:MB+1},w,h,ins);}
function trace(cam,rings){ctx.beginPath();
  for(var i=0;i<rings.length;i++){var r=rings[i];if(r.length<3)continue;var p0=project(cam,r[0][0],r[0][1]);ctx.moveTo(p0.x,p0.y);
    for(var j=1;j<r.length;j++){var p=project(cam,r[j][0],r[j][1]);ctx.lineTo(p.x,p.y);}ctx.closePath();}}

/* ---- save ---- */
var SAVE_KEY='glow-globe-v1';
function fresh(){return{v:1,sound:true,tutorial:0,currentContinent:'europe',currentRegion:'uk',partial:{},doneRegions:[],doneContinents:[]};}
function hasProgress(s){return s.doneRegions.length||s.doneContinents.length||s.tutorial>0||Object.keys(s.partial).some(function(k){return s.partial[k]&&s.partial[k].length;});}
function load(){try{var raw=localStorage.getItem(SAVE_KEY);if(!raw)return fresh();var d=JSON.parse(raw);if(!d||d.v!==1)return fresh();var f=fresh();for(var k in f)d[k]=d[k]!==undefined?d[k]:f[k];return d;}catch(e){return fresh();}}
function saveS(s){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));}catch(e){}}
function earthPct(s){return Math.round(s.doneRegions.length/REGION_COUNT*100);}
function regionUnlocked(s,ci,ri){if(ci>0&&s.doneContinents.indexOf(DATA[ci-1].id)<0)return false;if(ri<=0)return true;return s.doneRegions.indexOf(DATA[ci].regions[ri-1].id)>=0;}
function litIDs(s,region){if(s.doneRegions.indexOf(region.id)>=0)return region.cities.map(function(c){return c.id;});return(s.partial[region.id]||[]);}

/* ---- audio ---- */
var audio={ctx:null,core:null,started:false,muted:false,
  unlock:function(){if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}
    var C=window.AudioContext||window.webkitAudioContext;if(!C)return;try{this.ctx=new C();this.core=this.ctx.createGain();this.core.gain.value=this.muted?0:1;this.core.connect(this.ctx.destination);if(this.ctx.state==='suspended')this.ctx.resume();this.started=true;}catch(e){}},
  setMuted:function(m){this.muted=m;if(this.core&&this.ctx)this.core.gain.setTargetAtTime(m?0:1,this.ctx.currentTime,0.03);},
  tone:function(f,when,dur,lv,type){if(!this.ctx||!this.started)return;var o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type||'sine';o.frequency.value=f;g.gain.setValueAtTime(0.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(0.0002,lv),when+0.012);g.gain.exponentialRampToValueAtTime(0.0001,when+dur);
    o.connect(g);g.connect(this.core);o.start(when);o.stop(when+dur+0.05);},
  city:function(n,big){if(!this.ctx)return;var b=470+Math.min(8,n)*30;this.tone(b,this.ctx.currentTime,big?0.3:0.16,big?0.07:0.045);this.tone(b*2,this.ctx.currentTime+0.02,0.12,big?0.03:0.018);if(big)this.tone(b*1.5,this.ctx.currentTime+0.06,0.34,0.045,'triangle');},
  already:function(){if(this.ctx)this.tone(174,this.ctx.currentTime,0.12,0.03,'triangle');},
  region:function(){if(!this.ctx)return;[523.25,659.25,783.99,1046.5].forEach(function(f,i){audio.tone(f,audio.ctx.currentTime+i*0.035,0.6,0.05,'triangle');});},
  continent:function(){if(!this.ctx)return;[392,523.25,659.25,783.99,1046.5].forEach(function(f,i){audio.tone(f,audio.ctx.currentTime+i*0.1,0.5,0.055,'triangle');});},
  world:function(){if(!this.ctx)return;[261.63,329.63,392,523.25,659.25,783.99,1046.5].forEach(function(f,i){audio.tone(f,audio.ctx.currentTime+i*0.12,0.7,0.05,'triangle');});}};

/* ---- fx ---- */
var particles=[],sparks=[],shake=0,glowAmt=0;
function burst(x,y,n,big){for(var i=0;i<n;i++){var a=Math.random()*TAU,sp=(big?80:40)+Math.random()*(big?170:90),life=(big?0.9:0.5)+Math.random()*0.25;
  particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-(big?40:16),life:life,max:life,r:(big?2.2:1.4)+Math.random()*2});}}
function stepFx(dt){for(var i=0;i<particles.length;i++){var p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=28*dt;}
  particles=particles.filter(function(p){return p.life>0;});for(var j=0;j<sparks.length;j++)sparks[j].life-=dt;sparks=sparks.filter(function(s){return s.life>0;});
  shake=Math.max(0,shake-dt*14);glowAmt=Math.max(0,glowAmt-dt*0.8);}

/* ---- state ---- */
var S={save:load(),screen:'title',contId:'europe',regId:'uk',cities:[],lit:new Set(),tapOrder:[],shakes:{},hoverId:null,pressedId:null,lonelyId:null,t:0};
var LAST=performance.now();
var id2city={};

function layout(region){var ins=H<430?{top:56,right:12,bottom:70,left:12}:{top:80,right:16,bottom:88,left:16};
  var cam=cameraForRegion(region,W,H,ins);
  var pts=region.cities.map(function(c){var p=project(cam,c.lon,c.lat);return{c:c,x:p.x,y:p.y,sx:p.x,sy:p.y};});
  var lim={minX:ins.left+6,minY:ins.top+6,maxX:W-ins.right-6,maxY:H-ins.bottom-6};
  var minD=52;
  for(var it=0;it<30;it++){for(var i=0;i<pts.length;i++)for(var j=i+1;j<pts.length;j++){var dx=pts[j].x-pts[i].x,dy=pts[j].y-pts[i].y,d=Math.hypot(dx,dy);
    if(d<minD){if(d<0.01){dx=j-i+0.4;dy=0.8;d=1;}var push=(minD-d)/2,u=dx/d,v=dy/d;pts[i].x-=u*push;pts[i].y-=v*push;pts[j].x+=u*push;pts[j].y+=v*push;}}
    for(var k=0;k<pts.length;k++){pts[k].x=pts[k].x*0.86+pts[k].sx*0.14;pts[k].y=pts[k].y*0.86+pts[k].sy*0.14;pts[k].x=clamp(pts[k].x,lim.minX,lim.maxX);pts[k].y=clamp(pts[k].y,lim.minY,lim.maxY);}}
  return pts;}

function assignLabels(){var dirs=[[11,-5,0],[11,15,0],[-11,-5,2],[-11,15,2],[0,-24,1],[0,22,1],[16,-20,0],[-16,-20,2],[16,24,0],[-16,24,2]];var placed=[];
  for(var i=0;i<S.cities.length;i++){var c=S.cities[i];var wd=Math.max(28,c.c.name.length*7.3),hp=16;var best=dirs[0],bs=1e9;
    for(var d2=0;d2<dirs.length;d2++){var d=dirs[d2];var score=0;
      for(var p=0;p<placed.length;p++)if(Math.abs(placed[p].x-(c.x+d[0]))<wd+8&&Math.abs(placed[p].y-(c.y+d[1]))<hp+2)score+=500;
      if(score<bs){bs=score;best=d;}}placed.push({x:c.x+best[0],y:c.y+best[1],w:wd,h:hp});
    c.textX=c.x+best[0];c.textY=c.y+best[1];c.align=best[2]===1?'center':best[2]===0?'left':'right';}}

function refreshHeader(){var el=$('#playhead');if(!el)return;var fr=findRegion(S.regId);var region=fr.region;
  el.innerHTML=(region.flag||'')+' '+region.name+' <span class="right">'+S.lit.size+'/'+region.cities.length+'</span>';el.style.display='block';}

function hideAll(){$('#ov-title').classList.remove('on');$('#ov-atlas').classList.remove('on');$('#ov-cont').classList.remove('on');$('#ov-hero').classList.remove('on');$('#ov-world').classList.remove('on');$('#tut').style.display='none';}

function enterPlay(){var fr=findRegion(S.regId);var continent=fr.continent,region=fr.region;
  S.contId=continent.id;S.regId=region.id;S.cities=layout(region);
  var lit=litIDs(S.save,region);S.lit=new Set(lit);S.tapOrder=lit.slice();S.shakes={};
  S.lonelyId=(region.cities.length-lit.length)===1?region.cities.filter(function(c){return lit.indexOf(c.id)<0;})[0].id:null;
  assignLabels();id2city={};
  for(var i=0;i<S.cities.length;i++)id2city[S.cities[i].c.id]=S.cities[i];
  S.screen='play';hideAll();refreshHeader();
  if(region.id==='uk'&&S.save.tutorial===0){var t=$('#tut');t.innerHTML='Tap every city to light it up.<br><span class="dim">Start with the bobbing arrow.</span>';t.style.display='block';}
  else{$('#tut').style.display='none';}}

function lightCity(id){if(S.screen!=='play')return;var fr=findRegion(S.regId);var region=fr.region;
  if(S.lit.has(id)){audio.already();S.shakes[id]=(S.shakes[id]||0)+0.5;return;}
  var c=S.cities.filter(function(x){return x.c.id===id;})[0];if(!c)return;
  S.lit=new Set(S.lit);S.lit.add(id);S.tapOrder.push(id);
  burst(c.x,c.y,26,S.lit.size===region.cities.length);
  if(navigator.vibrate)navigator.vibrate(15);audio.unlock();
  if(region.id==='uk'&&S.save.tutorial===0){S.save.tutorial=1;saveS(S.save);var tt=$('#tut');tt.innerHTML='Great! Now tap them all.';}
  var arr=[];S.lit.forEach(function(x){arr.push(x);});
  S.save.partial[S.regId]=arr;saveS(S.save);
  audio.city(arr.length,arr.length===region.cities.length);
  S.lonelyId=(region.cities.length-arr.length)===1?region.cities.filter(function(c){return arr.indexOf(c.id)<0;})[0].id:null;
  if(arr.length===region.cities.length){
    audio.region();glowAmt=1;shake=6;burst(c.x,c.y,60,true);
    S.save.partial[S.regId]=[];if(S.save.doneRegions.indexOf(region.id)<0)S.save.doneRegions.push(region.id);
    var cd=findContinent(S.contId).regions.every(function(r){return S.save.doneRegions.indexOf(r.id)>=0;});
    if(cd&&S.save.doneContinents.indexOf(S.contId)<0)S.save.doneContinents.push(S.contId);
    var wd=S.save.doneContinents.length>=DATA.length;saveS(S.save);
    setTimeout(function(){regionCard(region,cd,wd);},700);
  }else refreshHeader();}

function regionCard(region,cd,wd){S.screen='card';hideAll();
  var p=$('#ov-hero .panel');p.innerHTML='<div class="card"><div class="bigbuy">'+(region.flag||'')+'</div>'+
    '<h2>'+region.name+' - Glowing!</h2><p class="fact">'+region.fact+'</p><p class="dim">Capital: '+region.capital+'</p>'+
    '<button class="btn big" id="b-next">'+(wd?'See the world':cd?'Continent is alight!':'Next region')+'</button></div>';
  $('#ov-hero').classList.add('on');
  S.card={cd:cd,wd:wd,reg:region.id,cont:S.contId};}
function nextFromCard(){var c=S.card;if(!c)return;
  if(c.wd){enterWorld();return;}if(c.cd){enterContinentHero(findContinent(c.cont));return;}
  var cont=findContinent(c.cont);var i=cont.regions.map(function(r){return r.id;}).indexOf(c.reg);var nx=cont.regions[i+1];
  if(nx){S.regId=nx.id;saveS(S.save);enterPlay();}else enterContinentHero(cont);}

var FUNNY={'europe':'Europe invented the coffee break, then took every single one.','asia':'Asia: four billion people and still no agreed seating plan.','africa':'Africa: the whole continent packed into one sentence - no.','north-america':'North America loudly insists it is two whole countries.','south-america':'South America: so much rhythm the map had to wobble.','oceania':'Oceania: mostly ocean. The name checks out.'};

function enterContinentHero(cont){S.screen='hero';S.contId=cont.id;hideAll();audio.unlock();audio.continent();if(navigator.vibrate)navigator.vibrate([20,40,60]);burst(W/2,H/2,80,true);glowAmt=1;
  var q=S.save.doneContinents.indexOf(cont.id)<0;
  var p=$('#ov-hero .panel');p.innerHTML='<h2>'+cont.name+(q?' is alight!':'')+'</h2><p class="fact">'+cont.blurb+'</p><p class="funny">'+FUNNY[cont.id]+'</p><button class="btn big" id="b-nextc">Next continent</button>';
  $('#ov-hero').classList.add('on');}
function nextContinent(){var i=DATA.map(function(c){return c.id;}).indexOf(S.contId);var nx=DATA[Math.min(DATA.length-1,i+1)];
  S.contId=nx.id;S.regId=nx.regions[0].id;saveS(S.save);enterContinentOverlay(nx.id);}
function enterWorld(){S.screen='world';hideAll();audio.world();burst(W/2,H/2,120,true);glowAmt=1;
  var p=$('#ov-world .panel');p.innerHTML='<h2>The whole world glows</h2><p class="fact">...and it started with you. Thank you for playing!</p><button class="btn big" id="b-again">Play again</button>';$('#ov-world').classList.add('on');}

function enterContinentOverlay(contId){S.screen='cont';S.contId=contId;hideAll();var cont=findContinent(contId);
  var ci=DATA.map(function(c){return c.id;}).indexOf(contId);var h='<h2>'+cont.name+' - '+earthPct(S.save)+'% of Earth</h2><div class="reg-grid">';
  for(var i=0;i<cont.regions.length;i++){var r=cont.regions[i];var done=S.save.doneRegions.indexOf(r.id)>=0,lock=!regionUnlocked(S.save,ci,i);
    h+='<div class="regcell'+(done?' done':'')+(lock?' lock':'')+'" data-id="'+r.id+'">'+(lock?'\uD83D\uDD12':(r.flag||''))+'<b>'+r.name+'</b>'+(done?'<i>done</i>':'')+'</div>';}
  h+='</div><button class="btn ghost" id="b-close">Back</button>';$('#ov-cont .panel').innerHTML=h;$('#ov-cont').classList.add('on');}
function enterAtlas(){S.screen='atlas';hideAll();var h='<h2>Glow Atlas - '+earthPct(S.save)+'% of Earth</h2>';
  for(var ci=0;ci<DATA.length;ci++){var c=DATA[ci];var cd=S.save.doneContinents.indexOf(c.id)>=0;
    h+='<div class="ct"><h3>'+(cd?'\u2728':'')+c.name+'</h3><div class="reg-grid">';
    for(var ri=0;ri<c.regions.length;ri++){var r=c.regions[ri];var done=S.save.doneRegions.indexOf(r.id)>=0,lock=!regionUnlocked(S.save,ci,ri);
      h+='<div class="regcell'+(done?' done':'')+(lock?' lock':'')+'" data-id="'+r.id+'">'+(lock?'\uD83D\uDD12':(r.flag||''))+'<b>'+r.name+'</b></div>';}
    h+='</div></div>';}
  h+='<button class="btn ghost" id="b-close">Back</button>';$('#ov-atlas .panel').innerHTML=h;$('#ov-atlas').classList.add('on');}
function enterTitle(){S.screen='title';hideAll();var pct=earthPct(S.save);
  $('#ov-title .panel').innerHTML='<h1>Glow Globe</h1><p class="tag">Light up the world, one city at a time.</p>'+
    (hasProgress(S.save)?'<div class="prog"><span>Earth <b>'+pct+'%</b> lit</span><div class="bar"><i style="width:'+pct+'%"></i></div></div>':'')+
    '<button class="btn big" id="b-play">'+(hasProgress(S.save)?'Continue':'Play')+'</button>'+
    '<button class="btn" id="b-atlas">Glow Atlas</button>'+
    '<button class="btn ghost" id="b-sound">Sound: '+(S.save.sound?'on':'off')+'</button>'+
    (hasProgress(S.save)?'<button class="btn ghost" id="b-reset">Reset</button>':'')+
    '<p class="ie">A puzzle - light every city, every country, every continent.</p>';
  $('#ov-title').classList.add('on');}

/* ---- render ---- */
var stars=[];
for(var si=0;si<120;si++)stars.push({x:((si*0.0137)%1),y:((si*0.029)%1),s:0.4+((si*0.071)%1)*1.3});

function drawBg(){var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#050814');g.addColorStop(1,'#10192c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(var i=0;i<stars.length;i++){var st=stars[i];var a=0.2+Math.abs(Math.sin(S.t*0.7+st.x*9))*0.55;ctx.fillStyle='rgba(232,220,196,'+a+')';ctx.fillRect(st.x*W,st.y*H,st.s,st.s);}}

function drawPlay(){var fr=findRegion(S.regId);var continent=fr.continent,region=fr.region;
  var cam=cameraForRegion(region,W,H,H<430?{top:56,right:12,bottom:70,left:12}:{top:80,right:16,bottom:88,left:16});
  for(var s=0;s<continent.regions.length;s++){var sib=continent.regions[s];if(sib.id===region.id)continue;var sr=RINGS[sib.id];if(!sr)continue;
    ctx.beginPath();trace(cam,sr);ctx.fillStyle='#121c33';ctx.fill();ctx.beginPath();trace(cam,sr);ctx.strokeStyle='#24344f';ctx.lineWidth=1;ctx.stroke();}
  var rings=RINGS[region.id];if(rings){ctx.beginPath();trace(cam,rings);ctx.fillStyle='#1b2c4c';ctx.fill();
    if(glowAmt>0){ctx.beginPath();trace(cam,rings);ctx.globalAlpha=0.28+glowAmt*0.5;ctx.fillStyle='#e0ae45';ctx.fill();
      ctx.globalAlpha=0.4*glowAmt;ctx.lineWidth=8;ctx.strokeStyle='#f0b429';ctx.beginPath();trace(cam,rings);ctx.stroke();}
    ctx.globalAlpha=1;ctx.lineWidth=1.6;ctx.strokeStyle=glowAmt>0?'#ffe7b3':'#e6c98a';ctx.beginPath();trace(cam,rings);ctx.stroke();}
  var lit=[];for(var k=0;k<S.tapOrder.length;k++){var c2=id2city[S.tapOrder[k]];if(c2)lit.push(c2);}
  if(lit.length>=2){ctx.strokeStyle='rgba(120,170,255,0.35)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(lit[0].x,lit[0].y);for(var L=1;L<lit.length;L++)ctx.lineTo(lit[L].x,lit[L].y);ctx.stroke();}
  ctx.font='600 13px system-ui,sans-serif';ctx.textBaseline='middle';
  for(var i=0;i<S.cities.length;i++){var c=S.cities[i];var litNow=S.lit.has(c.c.id);
    var jx=Math.sin(S.t*42+c.x)*(S.shakes[c.c.id]||0)*5,jy=Math.cos(S.t*36+c.y)*(S.shakes[c.c.id]||0)*4;
    var x=c.x+jx,y=c.y+jy,hover=S.hoverId===c.c.id,pressed=S.pressedId===c.c.id,lonely=S.lonelyId===c.c.id&&!litNow;
    var pulse=lonely?1+Math.sin(S.t*5)*0.22:1,sc=(pressed?0.86:1)*pulse;
    if(Math.hypot(c.x-c.sx,c.y-c.sy)>9){ctx.strokeStyle='rgba(154,166,189,0.55)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(c.sx,c.sy);ctx.lineTo(x,y);ctx.stroke();
      ctx.fillStyle='#9aa6bd';ctx.beginPath();ctx.arc(c.sx,c.sy,2.2,0,TAU);ctx.fill();}
    if(litNow){var r2=(lonely?8:6.2)*sc;ctx.fillStyle='rgba(240,180,41,0.16)';ctx.beginPath();ctx.arc(x,y,r2*3.2,0,TAU);ctx.fill();
      ctx.fillStyle='rgba(255,214,120,0.38)';ctx.beginPath();ctx.arc(x,y,r2*1.75,0,TAU);ctx.fill();
      ctx.fillStyle='#fff8ea';ctx.beginPath();ctx.arc(x,y,r2*0.62,0,TAU);ctx.fill();}
    else{var r3=(hover?7:5)*sc;if(lonely){ctx.strokeStyle='rgba(240,180,41,0.85)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,14+Math.sin(S.t*5)*3,0,TAU);ctx.stroke();}
      ctx.fillStyle=hover?'#e7eefb':'#8e9bb3';ctx.beginPath();ctx.arc(x,y,r3,0,TAU);ctx.fill();}
    if(S.regId==='uk'&&S.save.tutorial===0&&c.c.id==='london'&&!S.lit.has('london')){var bob=Math.sin(S.t*4)*7;ctx.fillStyle='#f0b429';ctx.beginPath();ctx.moveTo(x,y-18+bob);ctx.lineTo(x-8,y-34+bob);ctx.lineTo(x+8,y-34+bob);ctx.closePath();ctx.fill();}
    var wd=ctx.measureText(c.c.name).width;var left=c.align==='left'?c.textX:c.align==='right'?c.textX-wd:c.textX-wd/2;
    ctx.fillStyle='rgba(7,11,22,0.78)';ctx.beginPath();ctx.roundRect(left-6,c.textY-10,wd+12,20,8);ctx.fill();
    ctx.fillStyle=litNow?'#ffe7b3':'#e4ebf6';ctx.textAlign=c.align;ctx.fillText(c.c.name,c.textX,c.textY);}}
function drawHero(){var cont=findContinent(S.contId);var groups=[];
  for(var i=0;i<cont.regions.length;i++){var rr=RINGS[cont.regions[i].id];if(rr&&rr.length)groups.push(rr);}
  var cam=ringsCamera(groups,W,H,{top:20,right:20,bottom:H*0.42,left:20});var pulse=0.45+Math.sin(S.t*1.7)*0.2;
  for(var j=0;j<cont.regions.length;j++){var rings=RINGS[cont.regions[j].id];if(!rings)continue;
    ctx.beginPath();trace(cam,rings);ctx.globalAlpha=0.2+pulse*0.25;ctx.lineWidth=14;ctx.strokeStyle='#f0b429';ctx.stroke();
    ctx.beginPath();trace(cam,rings);ctx.globalAlpha=0.82;ctx.fillStyle='#f0b429';ctx.fill();
    ctx.beginPath();trace(cam,rings);ctx.globalAlpha=1;ctx.lineWidth=1.5;ctx.strokeStyle='#fff6df';ctx.stroke();}}
function drawWorld(){var cam=worldCamera(W,H,{top:16,right:12,bottom:H*0.4,left:12});
  var groups=[];for(var i=0;i<DATA.length;i++)for(var j=0;j<DATA[i].regions.length;j++){var g=RINGS[DATA[i].regions[j].id];if(g&&g.length)groups.push(g);}
  ctx.globalAlpha=0.55+Math.sin(S.t*1.5)*0.15;ctx.fillStyle='#a87820';ctx.beginPath();trace(cam,LAND);ctx.fill();ctx.globalAlpha=1;
  var pulse=0.45+Math.sin(S.t*1.5)*0.25;ctx.globalAlpha=0.25+pulse*0.35;ctx.lineWidth=6;ctx.strokeStyle='#f0b429';
  for(var k=0;k<groups.length;k++){ctx.strokeStyle='#f0b429';ctx.beginPath();trace(cam,groups[k]);ctx.stroke();}
  ctx.globalAlpha=0.7+pulse*0.3;ctx.fillStyle='#f0b429';for(var m=0;m<groups.length;m++){ctx.beginPath();trace(cam,groups[m]);ctx.fill();}ctx.globalAlpha=1;}
function drawAtlasFrame(){var cam=worldCamera(W,H,{top:12,right:8,bottom:H*0.5,left:8});
  ctx.beginPath();trace(cam,LAND);ctx.fillStyle='#10192c';ctx.fill();
  for(var i=0;i<DATA.length;i++)for(var j=0;j<DATA[i].regions.length;j++){var rings=RINGS[DATA[i].regions[j].id];if(!rings)continue;
    var done=S.save.doneRegions.indexOf(DATA[i].regions[j].id)>=0;ctx.beginPath();trace(cam,rings);ctx.fillStyle=done?'#8a6416':'#16263f';ctx.fill();
    if(done){ctx.beginPath();trace(cam,rings);ctx.globalAlpha=0.5;ctx.fillStyle='#f0b429';ctx.fill();ctx.globalAlpha=1;}
    ctx.beginPath();trace(cam,rings);ctx.lineWidth=1;ctx.strokeStyle=done?'#ffe7b3':'#31405f';ctx.stroke();}}

function drawFrame(){var dt=Math.min(0.05,(performance.now()-LAST)/1000);LAST=performance.now();S.t+=dt;stepFx(dt);
  drawBg();ctx.save();if(shake>0.2)ctx.translate(Math.sin(S.t*46)*shake,Math.cos(S.t*39)*shake*0.6);
  if(S.screen==='play'&&S.cities.length)drawPlay();
  else if(S.screen==='hero')drawHero();
  else if(S.screen==='world')drawWorld();
  else drawAtlasFrame();
  ctx.restore();
  for(var i=0;i<sparks.length;i++){var sp=sparks[i];var k2=1-sp.life/sp.max;ctx.strokeStyle='rgba(255,231,179,'+(0.8*(1-k2))+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sp.x,sp.y);ctx.lineTo(sp.x+(sp.tx-sp.x)*k2,sp.y+(sp.ty-sp.y)*k2);ctx.stroke();}
  for(var j=0;j<particles.length;j++){var p=particles[j];var a=Math.max(0,p.life/p.max);ctx.fillStyle='rgba(255,214,120,'+a+')';ctx.beginPath();ctx.arc(p.x,p.y,p.r*a,0,TAU);ctx.fill();}
  requestAnimationFrame(drawFrame);}

/* ---- input ---- */
function hit(x,y){var best=null,bd=70;for(var i=0;i<S.cities.length;i++){var c=S.cities[i];var d=Math.hypot(c.x-x,c.y-y);if(d<bd){bd=d;best=c.c.id;}}return best;}
canvas.addEventListener('pointermove',function(e){if(S.screen!=='play')return;S.hoverId=hit(e.clientX,e.clientY);});
addEventListener('pointerdown',function(e){audio.unlock();if(S.screen==='play'){var c=hit(e.clientX,e.clientY);if(c)S.pressedId=c;}});
addEventListener('pointerup',function(e){if(S.screen!=='play'){S.pressedId=null;return;}var id=hit(e.clientX,e.clientY);S.pressedId=null;if(id)lightCity(id);});

/* ---- buttons ---- */
document.body.addEventListener('click',function(e){var t=e.target;
  if(t.id==='b-play'){if(!hasProgress(S.save)){S.regId='uk';S.save.currentRegion='uk';S.contId='europe';saveS(S.save);}if(!S.contId)S.contId='europe';enterPlay();return;}
  if(t.id==='b-atlas'){enterAtlas();return;}
  if(t.id==='b-sound'){S.save.sound=!S.save.sound;audio.setMuted(!S.save.sound);saveS(S.save);enterTitle();return;}
  if(t.id==='b-reset'){S.save=fresh();saveS(S.save);enterTitle();return;}
  if(t.id==='b-close'){enterTitle();return;}
  if(t.id==='b-next'){nextFromCard();return;}
  if(t.id==='b-nextc'){nextContinent();return;}
  if(t.id==='b-again'){S.save=fresh();saveS(S.save);enterTitle();return;}
  var cell=t.closest('.regcell');if(cell&&cell.dataset.id){var id=cell.dataset.id;var fr=findRegion(id);
    var ci=DATA.map(function(c){return c.id;}).indexOf(fr.continent.id);var ri=fr.continent.regions.map(function(r){return r.id;}).indexOf(id);
    if(regionUnlocked(S.save,ci,ri)){S.contId=fr.continent.id;S.regId=id;S.save.currentRegion=id;S.save.currentContinent=fr.continent.id;saveS(S.save);enterPlay();}return;}});

/* ---- boot ---- */
enterTitle();
document.addEventListener('pointerdown',function(){audio.unlock();},{once:true});
requestAnimationFrame(drawFrame);
`;

/* ---------- 7. Assemble HTML ---------- */
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Glow Globe</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;background:#050814;color:#e4ebf6;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#cv{position:fixed;inset:0;width:100vw;height:100vh;display:block}
.ov{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:20;padding:18px}
.ov.on{display:flex}
.panel{max-width:520px;width:100%;text-align:center;background:rgba(7,11,22,0.85);border:1px solid #24344f;border-radius:18px;padding:24px 20px;max-height:92vh;overflow-y:auto}
h1{font-size:40px;color:#ffe7b3;text-shadow:0 0 28px rgba(240,180,41,0.55);margin-bottom:4px}
h2{font-size:24px;color:#ffe7b3;margin-bottom:8px}
h3{color:#9aa6bd;margin:12px 0 6px;text-align:left;font-size:14px}
p.tag{color:#9aa6bd;margin:6px 0 16px;font-size:14px}
p.fact{color:#e4ebf6;margin:8px 0;font-size:14px;line-height:1.5}
p.dim{color:#9aa6bd;font-size:13px}
p.funny{color:#f0b429;font-style:italic;font-size:15px;margin:10px auto 14px;max-width:380px;line-height:1.4}
.btn{display:block;width:100%;margin:9px 0;padding:13px;font-size:16px;font-weight:600;border-radius:12px;border:1px solid #31405f;background:#16263f;color:#e4ebf6;cursor:pointer}
.btn.big{background:linear-gradient(180deg,#f0b429,#d19a1d);color:#1a1200;border:none;font-size:18px}
.btn.ghost{background:transparent}
.btn:active{transform:scale(0.98)}
.prog{margin:6px 0 14px;color:#9aa6bd;font-size:13px;text-align:left}
.prog span{display:block;margin-bottom:4px}
.bar{height:8px;border-radius:5px;background:#10192c;overflow:hidden}
.bar i{display:block;height:100%;background:linear-gradient(90deg,#f0b429,#ffe7b3);border-radius:5px}
#playhead{position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(7,11,22,0.8);border:1px solid #31405f;border-radius:999px;padding:8px 18px;font-size:15px;z-index:30}
#playhead .right{color:#f0b429;font-weight:700;margin-left:8px}
.tut{position:fixed;top:16%;left:50%;transform:translateX(-50%);background:rgba(7,11,22,0.92);border:1px solid #f0b429;border-radius:14px;padding:14px 22px;font-size:17px;text-align:center;z-index:34}
.tut .dim{font-size:13px}
.reg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin:10px 0 6px}
.regcell{border:1px solid #31405f;border-radius:12px;padding:12px 6px;cursor:pointer;background:#10192c;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:13px}
.regcell b{color:#e4ebf6;font-size:13px}
.regcell.done{background:#1e2a15;border-color:#8a6416}
.regcell.done b{color:#ffe7b3}
.regcell.lock{opacity:0.55;cursor:not-allowed}
.regcell i{color:#f0b429;font-style:normal;font-size:12px}
.ct{margin-bottom:4px}
.card{text-align:center}
.bigbuy{font-size:60px;margin-bottom:6px}
.ie{font-size:12px;color:#6b7894;margin-top:8px;line-height:1.4}
</style>
</head>
<body>
<canvas id="cv"></canvas>
<div class="ov" id="ov-title"><div class="panel"></div></div>
<div class="ov" id="ov-atlas"><div class="panel"></div></div>
<div class="ov" id="ov-cont"><div class="panel"></div></div>
<div class="ov" id="ov-hero"><div class="panel"></div></div>
<div class="ov" id="ov-world"><div class="panel"></div></div>
<div id="playhead" style="display:none"></div>
<div id="tut" class="tut" style="display:none"></div>
<script>
${GAME_JS
  .replace("__PLACES__", placesJson)
  .replace("__REGIONS__", regionsJson)
  .replace("__LAND__", landJson)
  .replace("__BBOX__", bboxJson)}
</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, "utf8");
const bytes = fs.statSync(OUT).size;
console.log("WROTE", OUT, bytes, "bytes");
if (bytes > 320000) console.warn("WARN: over ~300KB target");
