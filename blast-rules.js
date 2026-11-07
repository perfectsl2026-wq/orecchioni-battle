// HE grenade and incendiary. Both fly like the flashbang (objective-rules moves every
// grenade); on detonation the HE deals damage through open air within 6 m, the
// incendiary leaves a fire patch that burns whoever stands in it for 7 s. A smoke
// cloud put down on a fire extinguishes it. Damage is applied by the host
// through the callback, so kills and assists go through the usual path.
import {groundHeight,wallDistance} from './shared.js?v=42.0';
import {eyeHeight} from './player-feel.js?v=42.0';
import {ACTIVE as SMOKES} from './smoke-rules.js?v=42.0';
export const HE={radius:6,max:98,fuseMs:1600,armor:.6};
export const FIRE={ms:7000,radius:3.3,dps:14,fuseMs:1400,tickMs:250};
export const WEAPON_HE=6,WEAPON_FIRE=7;
export const UTILITY_NAMES={[WEAPON_HE]:'GRANATA HE',[WEAPON_FIRE]:'INCENDIARIA'};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Fire reaches a body only through open air, like the HE; the same answer drives damage and the bots' flight.
function fireReaches(f,p){
 const from=[f.x,f.y+.4,f.z],v=[p.x-from[0],eyeHeight(p)-.35-from[1],p.z-from[2]],d=Math.hypot(...v);
 return d<=.3||wallDistance(from,v.map(c=>c/d),d)>=d-.1;
}
export function throwUtility(state,p,now,kind,{eye,target=null,enabled=true}={}){
 const field=kind==='he'?'hes':'fires';
 if(!enabled||p.hp<=0||!(p[field]>0)||now<(p.flashReady||0)||p.reload||now<(p.equipUntil||0))return null;
 p[field]--;p.flashReady=now+1000;p.equipUntil=now+350;
 const g={id:++state.utilitySerial,kind,owner:p.id,team:p.team,x:p.x,y:eye,z:p.z,born:now,explodeAt:now+(kind==='he'?HE.fuseMs:FIRE.fuseMs)};
 if(target){const T=Math.max(.7,Math.min(1.5,Math.hypot(target.x-p.x,target.z-p.z)/14)),ty=groundHeight(target.x,target.z)+.2;
  g.vx=(target.x-p.x)/T;g.vz=(target.z-p.z)/T;g.vy=(ty-eye+6*T*T)/T;g.explodeAt=now+T*1000+(kind==='he'?400:120);}
 else{const cp=Math.cos(p.pitch||0);g.vx=-Math.sin(p.yaw)*cp*13;g.vy=Math.sin(p.pitch||0)*13+2.5;g.vz=-Math.cos(p.yaw)*cp*13;}
 state.grenades??=[];state.grenades.push(g);return g;
}
// Damage of an HE at a player: linear falloff, blocked by walls, reduced by armour.
export function heDamage(g,p){
 const chest=[p.x,eyeHeight(p)-.35,p.z],d=Math.hypot(chest[0]-g.x,chest[1]-g.y,chest[2]-g.z);if(d>HE.radius)return 0;
 const dir=[(chest[0]-g.x)/Math.max(.001,d),(chest[1]-g.y)/Math.max(.001,d),(chest[2]-g.z)/Math.max(.001,d)];
 if(d>.3&&wallDistance([g.x,g.y,g.z],dir,d)<d-.1)return 0;
 const raw=HE.max*Math.max(0,1-Math.max(0,d-.8)/(HE.radius-.8));
 return Math.round((p.armor||0)>0?raw*HE.armor:raw);
}
// Called when a grenade's fuse ends: HE detonates (hurt callback per player), the
// incendiary becomes a fire unless it lands in smoke.
export function detonate(state,g,now,hurt,emit){
 if(g.kind==='he'){
  for(const p of Object.values(state.players)){if(p.hp<=0||p.loading)continue;if(p.team===g.team&&p.id!==g.owner)continue;const dmg=heDamage(g,p);if(dmg>0)hurt(p,g.owner,dmg,WEAPON_HE,[g.x,g.y,g.z]);}
  emit({kind:'he',point:[g.x,g.y,g.z],time:now});return;
 }
 if(g.kind==='fire'){
  const smoked=SMOKES.some(s=>Math.hypot(s.x-g.x,s.z-g.z)<s.r+1);
  if(smoked){emit({kind:'douse',point:[g.x,g.y,g.z],time:now});return;}
  (state.fires??=[]).push({id:g.id,owner:g.owner,team:g.team,x:g.x,z:g.z,y:groundHeight(g.x,g.z),born:now,until:now+FIRE.ms,nextTick:now});
  emit({kind:'fire',point:[g.x,groundHeight(g.x,g.z),g.z],time:now});
 }
}
// Host step: burn players in fire patches, expire patches, douse those under smoke.
export function updateFires(state,now,hurt,emit){
 const fires=state.fires||[];if(!fires.length)return;
 for(let n=fires.length-1;n>=0;n--){const f=fires[n];
  if(now>=f.until){fires.splice(n,1);continue;}
  if(SMOKES.some(s=>Math.hypot(s.x-f.x,s.z-f.z)<s.r+.8&&now-s.born>300)){fires.splice(n,1);emit({kind:'douse',point:[f.x,f.y,f.z],time:now});continue;}
  if(now<f.nextTick)continue;f.nextTick=now+FIRE.tickMs;
  for(const p of Object.values(state.players)){if(p.hp<=0||p.loading)continue;if(p.team===f.team&&p.id!==f.owner)continue;
   if(distance(p,f)<=FIRE.radius&&Math.abs((p.y||0)-f.y)<1.2&&fireReaches(f,p))hurt(p,f.owner,Math.round(FIRE.dps*FIRE.tickMs/1000),WEAPON_FIRE,[f.x,f.y,f.z]);}
 }
}
export const inFire=(state,p)=>(state.fires||[]).some(f=>distance(p,f)<=FIRE.radius+.4&&Math.abs((p.y||0)-f.y)<1.2&&fireReaches(f,p));
