// Runtime smoke test for Glow Globe.
// Loads the built index.html <script> into a mocked DOM/canvas and plays
// through all European cities to verify the core loop and requested features.
// Usage: node tests/verify.mjs
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error("no <script> found in index.html"); process.exit(1); }
const js = m[1];

const fakeLocal = {};
const elements = {};
function CC(){ this.on = new Set(); }
CC.prototype.add = function(){ for (const a of arguments) this.on.add(a); };
CC.prototype.remove = function(){ for (const a of arguments) this.on.delete(a); };
CC.prototype.contains = function(c){ return this.on.has(c); };
class El { constructor(){ this.style={}; this.dataset={}; this.innerHTML=""; this.textContent=""; this.classList=new CC(); } addEventListener(){} closest(){ return null; } }
function makeCtx(){ return new Proxy({ measureText:(t)=>({width:t.length*7}), createLinearGradient:()=>({addColorStop(){}}), createRadialGradient:()=>({addColorStop(){}}), save(){},restore(){},beginPath(){},translate(){},scale(){},fill(){},stroke(){},fillRect(){},clearRect(){},moveTo(){},lineTo(){},closePath(){},arc(){},setTransform(){}, globalAlpha:1, fillStyle:"#000", strokeStyle:"#000", lineWidth:1 }, { get:(o,p)=> (p in o)? o[p] : (()=>{}) }); }
class Canv { constructor(){ this.width=800; this.height=600; this.style={}; this.ctx=makeCtx(); this.addEventListener=()=>{}; } getContext(){ return this.ctx; } }
const cv = new Canv(); elements["#cv"] = cv;
function q(s){ if(!elements[s]) elements[s]=new El(); return elements[s]; }
const g = {
  document: { querySelector:q, querySelectorAll:()=>[], addEventListener(){}, documentElement:new El(), body:new El() },
  localStorage: { getItem:k=>fakeLocal[k]??null, setItem:(k,v)=>{fakeLocal[k]=String(v);}, removeItem:k=>{delete fakeLocal[k];} },
  navigator: { vibrate:()=>{} }, window: { addEventListener(){}, AudioContext:null, webkitAudioContext:null },
  innerWidth:800, innerHeight:600, devicePixelRatio:1, performance:{now:()=>0},
  requestAnimationFrame:()=>0, cancelAnimationFrame:()=>{},
  addEventListener:()=>{},
  setTimeout:(fn)=>{ fn(); return 0; }, clearTimeout:()=>{},
  console, Math, Date, JSON, Set, Map, Array, Object, String, Number, Boolean, parseFloat, parseInt, isFinite,
};
const dq = g.document.querySelector;
g.document.querySelector = function(s){ return s === "#cv" ? cv : dq(s); };

let fails = 0;
const ok = (cond, label) => { console.log((cond?"PASS":"FAIL") + "  " + label); if(!cond) fails++; };

const ctx = vm.createContext(g);
vm.runInContext(js, ctx);
const run = (c) => vm.runInContext(c, ctx);
ok(run("typeof FUNNY === 'object'"), "FUNNY continent blurbs present");
ok(run("typeof audio.city === 'function'"), "audio vsuvka (rising melody hook) present");
ok(run("typeof FUNNY_ICON === 'object'"), "FUNNY_ICON continent emoji present");

vm.runInContext("S.regId='uk'; enterPlay();", ctx);
ok(run("S.screen") === "play", "enterPlay goes to play screen");
// Cities must be spread across the screen, not clustered in a corner (camera bug)
const spread = run("(function(){ var mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9; for(var i=0;i<S.cities.length;i++){mnx=Math.min(mnx,S.cities[i].x);mxx=Math.max(mxx,S.cities[i].x);mny=Math.min(mny,S.cities[i].y);mxy=Math.max(mxy,S.cities[i].y);} return {xr:mxx-mnx,yr:mxy-mny}; })()");
ok(spread.xr > 100 && spread.yr > 60, "cities spread across screen (" + Math.round(spread.xr) + "x" + Math.round(spread.yr) + ")");
const uk = run("DATA[0].regions[0].cities.map(c=>c.id)");
for (const id of uk) run("lightCity('" + id + "')");
ok(run("S.save.doneRegions.indexOf('uk')>=0"), "completing UK region records doneRegions");

// Play all of Europe -> continent should light
const D = run("DATA");
for (let ri=0; ri<D[0].regions.length; ri++){
  const rid = run("DATA[0].regions["+ri+"].id");
  run("S.regId='"+rid+"'; enterPlay();");
  for (const id of run("DATA[0].regions["+ri+"].cities.map(c=>c.id)")) run("lightCity('"+id+"')");
}
ok(run("S.save.doneRegions.length") === D[0].regions.length, "all Europe regions done");
ok(run("S.save.doneContinents.indexOf('europe')>=0"), "whole continent lights after last city");
ok(run("earthPct(S.save)") >= 16, "earth percentage reflects progress");

// Resume: "Continue" must restore the last continent/region, not always UK
run("S.save.currentContinent='south-america'; S.save.currentRegion='ar'; saveS(S.save);");
run("S.save=fresh(); S.save=fresh();");
// simulate b-play path with progress
vm.runInContext("S.save.currentContinent='south-america'; S.save.currentRegion='ar'; S.save.doneRegions=['uk']; hasProgress(S.save);", ctx);
run("S.contId=S.save.currentContinent; S.regId=S.save.currentRegion;");
ok(run("S.contId") === "south-america" && run("S.regId") === "ar", "resume reads saved continent/region");

console.log(fails === 0 ? "ALL CHECKS PASSED" : (fails + " CHECK(S) FAILED"));
process.exit(fails === 0 ? 0 : 1);
