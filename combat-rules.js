import {eyeHeight,STANCE,RUN_SINK,LANDING} from './player-feel.js?v=42.0';
import {BOT_INPUT_SCALE} from './agent-motion.js?v=42.0';
import {WEAPONS,move,raySphere,wallDistance,penetrationAt} from './shared.js?v=42.0';
import {designOf,gunOf,weaponFor} from './weapon-stats.js?v=42.0';

// Tuning: a settled first shot, a repeatable spray, and a real cost to
// firing while running. The host uses the same rules for people and bots.
// `wallbang` is how much of a round's energy survives a penetrable surface (V31).
// V42: `accuracy` is the first-shot cone (diameter, rad), tight enough to land in a head at 50 m; `moving` the cone
// added at a full run, so stopping before the shot is what makes it land; `bloom` the cone each shot of a burst adds
// up to `cap`; `recovery` how fast a burst settles (ms). The sniper's `accuracy` is its unscoped cone, `scoped` the
// cone once the optic has settled for `scopeMs`.
export const GUN_RULES=[
 {speed:5.25,accuracy:.003,moving:.085,kick:.021,penetration:.55,wallbang:.3,bloom:.0045,cap:.018,recovery:105},
 {speed:5.2,accuracy:.0065,moving:.07,kick:.010,penetration:.62,wallbang:.33,bloom:.0018,cap:.022,recovery:95},
 {speed:4.85,accuracy:.0032,moving:.15,kick:.022,penetration:.78,wallbang:.75,bloom:.0055,cap:.035,recovery:135},
 {speed:5,accuracy:.0026,moving:.13,kick:.016,penetration:.8,wallbang:.62,bloom:.0045,cap:.03,recovery:120},
 {speed:4.3,accuracy:.07,scoped:.00025,scopeMs:200,moving:.3,kick:.07,penetration:1,wallbang:.9,bloom:0,cap:0,recovery:110},
 {speed:5.8,accuracy:0,moving:0,kick:0,penetration:1,wallbang:0,bloom:0,cap:0,recovery:85}
];
// The optic comes back this long before the bolt is closed: a click in that window waits for the bolt instead of being lost.
export const SCOPE_LEAD_MS=150;
export const GROUND={accel:43,brake:31,reverse:74,soft:26,softBelow:1.2};
// V42 b4a: a design with handling of its own (weapon-stats.js) tunes its class's rules; the class's speed always stays.
const designRules=new Map();
export function rulesFor(index,finish){const d=designOf(index,finish);if(!d)return GUN_RULES[index];let r=designRules.get(d);if(!r){r=Object.freeze({...GUN_RULES[index],...d.rules,speed:GUN_RULES[index].speed});designRules.set(d,r);}return r;}
export const rulesOf=(p,index=p.weapon)=>rulesFor(index,p.finishes?.[index]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function resetCombat(p){p.duck=0;p.jumpV=0;p.landedAt=-1e6;p.landingUntil=0;p.helmet=true;p.shots=0;p.recoilWeapon=p.weapon;p.lastShot=-1e6;p.vx=p.vz=p.speed=0;p.armor=100;p.received={};p.death=null;p.taggedUntil=0;p.equipUntil=0;p.weaponReady=WEAPONS.map(()=>0);}
export function movementScale(p,now){return (now<(p.taggedUntil||0)?.45+.55*clamp(1-(p.taggedUntil-now)/220,0,1):1)*(1-LANDING.slow*clamp(((p.landingUntil||0)-now)/LANDING.ms,0,1));}
export function movementSpeed(p,input={},now=Infinity){
 return GUN_RULES[p.weapon??3].speed*(1-(1-STANCE.speed)*clamp(p.duck||0,0,1))*(input.slow?.46:1)*((p.weapon??3)===4&&input.aim&&!p.bot?.5:1)*movementScale(p,now);
}
function resolveMovement(p,vx,vz,dt){
 p.vx=vx;p.vz=vz;const x=p.x,z=p.z,nudged=move(p,vx*dt,vz*dt);
 if(!nudged&&Math.abs(p.x-x)<.00001)p.vx=0;if(!nudged&&Math.abs(p.z-z)<.00001)p.vz=0;
 p.speed=Math.hypot(p.x-x,p.z-z)/Math.max(dt,.001);return p;
}
// Navigation already brakes and avoids corners in world space. Preserve that
// steering, but use the same weapon, stance, hit slowdown and collision rules.
export function stepBotMovement(p,input,dt,now){
 const len=Math.max(1,Math.hypot(input.forward||0,input.side||0)),yaw=p.yaw||0;
 const vx=(-Math.sin(yaw)*(input.forward||0)+Math.cos(yaw)*(input.side||0))/len*BOT_INPUT_SCALE;
 const vz=(-Math.cos(yaw)*(input.forward||0)-Math.sin(yaw)*(input.side||0))/len*BOT_INPUT_SCALE;
 const desired=Math.hypot(vx,vz),scale=desired>.00001?Math.min(1,movementSpeed(p,input,now)/desired):0;
 return resolveMovement(p,vx*scale,vz*scale,dt);
}
export function stepMovement(p,input,dt,now=Infinity){
 const f=clamp(input.forward||0,-1,1),s=clamp(input.side||0,-1,1),len=Math.max(1,Math.hypot(f,s));
 const speed=movementSpeed(p,input,now),yaw=p.yaw||0;
 const tx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)/len*speed,tz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)/len*speed;
 p.vx??=0;p.vz??=0;
 if((p.y||0)-(p.groundY||0)>.001){
  // Air steering adds velocity along the wish direction. Releasing movement
  // preserves momentum; changing keys cannot stop the player in mid-air.
  const wish=Math.hypot(tx,tz),before=Math.hypot(p.vx,p.vz);
  if(wish>.001){const nx=tx/wish,nz=tz/wish,add=Math.max(0,.85-(p.vx*nx+p.vz*nz)),gain=Math.min(add,12*speed*dt);p.vx+=nx*gain;p.vz+=nz*gain;}
  const v=Math.hypot(p.vx,p.vz),limit=Math.max(before,speed*1.05);if(v>limit){p.vx*=limit/v;p.vz*=limit/v;}
 }else{
  // Same stop and start times as the slower V41 rifles. The first metre per second comes softer: a counter-strafe rests at the accurate speed instead of bouncing through it.
  const reversing=p.vx*tx+p.vz*tz<0,accel=reversing?GROUND.reverse:Math.hypot(tx,tz)<.01?GROUND.brake:Math.hypot(p.vx,p.vz)<GROUND.softBelow?GROUND.soft:GROUND.accel,distance=Math.hypot(tx-p.vx,tz-p.vz),along=p.vx*tx+p.vz*tz,a=Math.min(1,accel*dt/Math.max(distance,.00001),reversing?-along/((tx-p.vx)*tx+(tz-p.vz)*tz):1);
  p.vx+=(tx-p.vx)*a;p.vz+=(tz-p.vz)*a;
 }
 return resolveMovement(p,p.vx,p.vz,dt);
}
// Authored angular control points (degrees); the first shot is settled.
// Patterns belong to this game. Crouching reduces inaccuracy, never the pattern.
// V42: the rifles step sideways from the second shot, so a held burst no longer climbs straight from chest into head;
// the climb is the same every magazine, so pulling against it is a skill that can be learned.
const PATTERNS=[
 [[0,0],[1.6,0],[2.5,-.25],[3.2,.35]],
 [[0,0],[.65,0],[1.5,.1],[2.6,-.3],[3.5,.65],[4,-.7],[4.1,.9],[4,-.8]],
 [[0,0],[1.25,.25],[2.8,-.35],[4.4,.5],[5.9,-.55],[7.2,-1],[8.3,-1.5],[8.9,-.6],[9.3,.8],[9.5,2.1],[9.4,3],[9.2,2.5],[9.1,.8],[9.1,-1.1],[9,-2.7],[8.9,-3.2]],
 [[0,0],[.9,-.2],[2,.25],[3.15,-.35],[4.3,-.35],[5.3,-.65],[6.15,-.9],[6.7,-.3],[7,.55],[7.2,1.45],[7.15,2],[7,1.6],[6.9,.45],[6.9,-.9],[6.8,-1.8],[6.8,-2]],
 [[0,0],[4.2,0]],[[0,0]]
];
// The sniper's kick is felt by the camera only: its bullets go where the reticle is.
export const RECOIL_STRENGTH=[.80,.72,.58,.50,.55,0],CAMERA_RECOIL=.72;
export function sprayOffset(index,shots,design=null){
 const points=design?.pattern||PATTERNS[index],strength=design?.recoil??RECOIL_STRENGTH[index],n=clamp(shots,0,design?.pattern&&index===0?points.length-1:index===0?3:index===4?1:29),at=design?.pattern&&index===0||n<7?n:7+(n-7)*(points.length-8)/22;
 const a=Math.min(points.length-1,Math.floor(Math.max(0,at))),b=Math.min(points.length-1,a+1),t=at-a;
 return {pitch:(points[a][0]+(points[b][0]-points[a][0])*t)*Math.PI/180*strength,yaw:(points[a][1]+(points[b][1]-points[a][1])*t)*Math.PI/180*strength};
}
export function recoilIndex(p,now){
 const w=gunOf(p),r=rulesOf(p),gap=now-(p.lastShot??-1e6),delay=p.weapon===4?140:Math.max(100,w.rate*1000+45);
 // Short taps/bursts settle faster; sustained sprays retain a longer recovery.
 const recovery=p.weapon===4?r.recovery:r.recovery+120*clamp(((p.shots||0)-3)/10,0,1);
 const value=(p.shots||0)*Math.exp(-Math.max(0,gap-delay)/recovery);
 return value<.025?0:value;
}
export function recoilAt(p,now){return sprayOffset(p.weapon,recoilIndex(p,now),designOf(p.weapon,p.finishes?.[p.weapon]));}
// How far the sniper's optic has settled, 0 to 1: from the later of the right press, the draw, the end of a reload and
// the optic's return before the bolt closes. A same-tick right and left click is a hip shot.
export function scopeSettle(p,now){
 if(p.weapon!==4||!p.input?.aim||p.reload)return 0;
 const from=Math.max(p.aimSince??-1e9,p.equipUntil||0,p.reloadDone||0,(p.weaponReady?.[4]||0)-SCOPE_LEAD_MS);
 // V42 b4b review: a semi-automatic design's optic also settles again after each shot over its own `shotSettle` (ms).
 const r=rulesOf(p),scope=clamp((now-from)/GUN_RULES[4].scopeMs,0,1);return r.shotSettle?Math.min(scope,clamp((now-(p.lastShot??-1e9))/r.shotSettle,0,1)):scope;
}
export function accuracyFor(p,now){
 const wi=p.weapon,r=rulesOf(p),speed=Number.isFinite(p.speed)?p.speed:Math.hypot(p.vx||0,p.vz||0),duck=clamp(p.duck||0,0,1);
 const deadzone=wi===4?.18:wi===1?.32:wi===0?.30:.27;
 const moving=clamp((speed/r.speed-deadzone)/(1-deadzone),0,1),air=(p.y||0)-(p.groundY||0)>.001||Math.abs(p.jumpV||0)>.1;
 const settle=wi===4?scopeSettle(p,now):0,open=1-settle;
 const base=(wi===4?r.scoped+(r.accuracy-r.scoped)*open*open:r.accuracy)*(1-duck*.27);
 const landing=clamp(((p.landingUntil||0)-now)/LANDING.ms,0,1)*.028;
 return base+r.moving*moving**1.6+(air?.11+Math.min(.15,Math.abs(p.jumpV||0)*.023)+(wi===4?.25:0):0)+landing+Math.min(r.cap,recoilIndex(p,now)*r.bloom);
}
export function shotParameters(p,now,random=Math.random){
 const wi=p.weapon;if(p.recoilWeapon!==wi)p.shots=0;
 p.recoilWeapon=wi;const shots=recoilIndex(p,now),kick=wi===4?{pitch:0,yaw:0}:sprayOffset(wi,shots,designOf(wi,p.finishes?.[wi])),spread=accuracyFor(p,now);
  // Players pull against the spray with the mouse; a bot does it through its level's recoil control.
  const pull=1-(p.recoilControl||0);
 const radius=Math.sqrt(random())*spread*.5,angle=random()*Math.PI*2;
 p.shots=shots+1;return {yaw:p.yaw+kick.yaw*pull+Math.cos(angle)*radius,pitch:p.pitch+kick.pitch*pull+Math.sin(angle)*radius,spread,kick};
}
// The next moment the weapon may fire. A held trigger keeps the remainder of the 60 Hz step, so the real
// rate of fire is the table's (the OB-320 at 667 rounds a minute, not 600); a fresh click starts from now.
export function nextReady(p,wi,now,rate=gunOf(p,wi).rate){const ready=p.weaponReady?.[wi]||0;return (now-ready<=20&&ready<=now?ready:now)+rate*1000;}
export const HIT_MULTIPLIERS={head:4,chest:1,arms:1,stomach:1.25,legs:.75};
// Spheres in the operator's own frame, fitted by raster to the skinned mesh of all four kits at rest,
// crouched and running: [zone, side, ahead, height, radius, share of the run sink], and for a leg, which
// folds instead of dropping, its crouched ahead and height. Eye height stays 1.55; the head sits above it,
// so the collar closes the line a level crosshair rides. The arm that reaches forward depends on the weapon: see hitZones.
const BODY=[['head',.035,0,1.71,.185,1],['chest',.035,0,1.45,.11,1],['chest',-.09,0,1.47,.1,1],['chest',.16,0,1.47,.1,1],['chest',.03,0,1.22,.285,1],['stomach',.03,0,.88,.265,.8],
 ['arms',-.28,0,1.22,.15,1],['arms',.34,0,1.22,.15,1],['arms',-.21,0,1.4,.12,1],['arms',.27,0,1.4,.12,1],
 ['legs',-.1,0,.56,.17,.3,.2,.34],['legs',.16,0,.56,.17,.3,.2,.34],['legs',-.11,0,.33,.15,.3,.4,.27],['legs',.17,0,.33,.15,.3,.4,.27],['legs',-.12,.04,.13,.13,0,.25,.12],['legs',.18,.04,.13,.13,0,.25,.12]];
export function hitZones(p){
 const duck=clamp(p.duck||0,0,1),y=p.y||0,drop=duck*STANCE.drop,sink=RUN_SINK*Math.min(1,(p.speed||0)/3),c=Math.cos(p.yaw||0),s=Math.sin(p.yaw||0);
 // The aim as animateAgent draws it: the head nods on the neck, the support hand swings with the gun.
 const aim=clamp(p.pitch||0,-1.15,1.15),nod=aim*.85,sinAim=Math.sin(aim),cosAim=Math.cos(aim),zones=BODY.map(([zone,side,ahead,high,radius,sag,lowAhead,lowHigh])=>{
  let a=lowAhead===undefined?ahead:ahead+(lowAhead-ahead)*duck,h=(lowHigh===undefined?high-drop:high+(lowHigh-high)*duck)-sink*sag;
  if(zone==='head'){a-=.25*Math.sin(nod);h+=.02*Math.sin(nod)-.21*(1-Math.cos(nod));}
  return {zone,center:[p.x+side*c-a*s,h+y,p.z-side*s-a*c],radius};
 });
 // Long guns hold the left arm out along the handguard, a pistol keeps both hands close, a knife holds neither forward.
 if(p.weapon!==5){const pistol=p.weapon===0,side=pistol?.135:.06,a=pistol?.19:.12+.3*cosAim+.084*sinAim,h=(pistol?1.4+.07*sinAim:1.414-.084*cosAim+.345*sinAim)-drop-sink;zones.push({zone:'arms',grip:true,center:[p.x+side*c-a*s,h+y,p.z-side*s-a*c],radius:pistol?.09:.13});}
 return zones;
}
// Every zone of a body, in any stance, lies within 1.3 m of this point: a ray clear of it tests nothing.
const clearOf=(o,d,v)=>{const x=v.x-o[0],y=(v.y||0)+.95-o[1],z=v.z-o[2],b=x*d[0]+y*d[1]+z*d[2];return x*x+y*y+z*z-b*b>1.69;};
// One hitscan leg: nearest body before the first solid.
function traceLeg(p,players,origin,d,range){
 let distance=wallDistance(origin,d,range),victim=null,zone='chest';
 for(const v of players){
  if(v.id===p.id||v.hp<=0||v.loading||clearOf(origin,d,v))continue;
  for(const part of hitZones(v)){
   // The head comes first and the gun arm last: a target looking up never shields its own face with it.
   if(part.grip&&victim===v&&zone==='head')continue;
   const hit=raySphere(origin,d,part.center,part.radius);
   if(hit<distance){distance=hit;victim=v;zone=part.zone;}
  }
 }
 return {victim,zone,distance,wall:!victim&&distance<range};
}
// Friendly bodies block a bullet, without dealing friendly damage. A thin wooden
// or sheet-metal solid lets the round through once, with less energy (V31):
// `through` carries the entry and exit points for the two holes, `scale` the
// damage left, `distance` the whole path for falloff.
export function traceShot(p,players,angles){
 const d=[-Math.sin(angles.yaw)*Math.cos(angles.pitch),Math.sin(angles.pitch),-Math.cos(angles.yaw)*Math.cos(angles.pitch)],origin=[p.x,eyeHeight(p),p.z],range=gunOf(p).range;
 const first=traceLeg(p,players,origin,d,range);
 let {victim,zone,distance}=first,through=null,scale=1,to=origin.map((v,i)=>v+d[i]*distance);
 const wallbang=rulesOf(p)?.wallbang||0;
 if(first.wall&&wallbang>0){
  const pen=penetrationAt(origin,d,first.distance);
  if(pen&&pen.scale*wallbang>=.1){
   const exitPoint=origin.map((v,i)=>v+d[i]*(pen.exit+.01)),second=traceLeg(p,players,exitPoint,d,range-pen.exit);
   through=[to,exitPoint];scale=pen.scale*wallbang;victim=second.victim;zone=second.zone;distance=pen.exit+.01+second.distance;to=exitPoint.map((v,i)=>v+d[i]*second.distance);
  }
 }
 return {victim,zone,distance,from:origin,to,direction:d,through,scale};
}
export function damageFor(index,zone,armor=0,distance=0,helmet=true,finish=null){
 const design=designOf(index,finish),falloff=(design?.falloff??[.92,.84,.98,.97,.99,1][index])**(Math.max(0,distance)/25.4);
 const raw=weaponFor(index,finish).damage*(HIT_MULTIPLIERS[zone]??1)*falloff,protectedHit=zone!=='legs'&&(zone!=='head'||helmet)&&armor>0;
 const reduced=protectedHit?raw*rulesFor(index,finish).penetration:raw,cost=(raw-reduced)*.5;
 const damage=protectedHit&&cost>armor?raw-armor*2:reduced;
 return {damage:Math.floor(damage),armor:Math.max(0,armor-cost)};
}
export function applyHit(victim,shooter,zone,now,melee=null,distance=0,scale=1){
 const hit=melee?{damage:melee.heavy?(melee.backstab?140:65):(melee.backstab?70:35),armor:victim.armor||0}:damageFor(shooter.weapon,zone,victim.armor||0,distance,victim.helmet!==false,shooter.finishes?.[shooter.weapon]);if(scale<1)hit.damage=Math.floor(hit.damage*scale);const damage=Math.min(victim.hp,hit.damage);
 victim.hp=Math.max(0,victim.hp-damage);victim.armor=hit.armor;victim.received??={};
 victim.taggedUntil=now+220;
 const record=victim.received[shooter.id]??={damage:0,hits:0};record.damage+=damage;record.hits++;
 return {damage,lethal:victim.hp===0,total:record.damage,hits:record.hits,headshot:zone==='head',time:now};
}

// Grenade and fire damage: armour already applied by the caller; records the hit
// like applyHit so assists, the death recap and kill credit work the same way.
export function applyBlast(victim,attackerId,amount,now){
 const damage=Math.min(victim.hp,Math.max(0,Math.round(amount)));victim.hp=Math.max(0,victim.hp-damage);victim.received??={};
 if((victim.armor||0)>0)victim.armor=Math.max(0,(victim.armor||0)-damage*.3);victim.taggedUntil=Math.max(victim.taggedUntil||0,now+120);
 const record=victim.received[attackerId]??={damage:0,hits:0};record.damage+=damage;record.hits++;
 return {damage,lethal:victim.hp===0,total:record.damage,hits:record.hits,headshot:false,time:now};
}
export function traceMelee(p,players,heavy=false){
 const from=[p.x,eyeHeight(p),p.z],forward=[-Math.sin(p.yaw)*Math.cos(p.pitch),Math.sin(p.pitch),-Math.cos(p.yaw)*Math.cos(p.pitch)],range=heavy?1.65:1.85;
 let victim=null,best=Infinity,to=from.map((v,i)=>v+forward[i]*range),direction=forward,backstab=false;
 for(const v of players){if(v.id===p.id||v.hp<=0||v.loading)continue;
  // The point of the body's axis nearest the swing, so a blade connects at any height, however close.
  const low=(v.y||0)+.2,span=1.67-(v.duck||0)*STANCE.drop,bx=v.x-from[0],by=low-from[1],bz=v.z-from[2],f=forward[1],along=bx*forward[0]+by*f+bz*forward[2];
  const target=[v.x,low+clamp((f*along-by)/Math.max(.01,1-f*f),0,span),v.z],delta=target.map((a,i)=>a-from[i]),distance=Math.hypot(...delta),dir=delta.map(a=>a/Math.max(.001,distance)),depth=delta.reduce((sum,a,i)=>sum+a*forward[i],0);
  // In the cone, or at arm's length with the swing passing through the body itself.
  if(distance>range+.25||distance>=best||depth<distance*Math.cos(.58)&&(depth<0||distance*distance-depth*depth>.1)||wallDistance(from,dir,distance)<distance-.04)continue;
  best=distance;victim=v;to=target;direction=dir;const dx=p.x-v.x,dz=p.z-v.z,d=Math.hypot(dx,dz);backstab=(-Math.sin(v.yaw||0)*dx-Math.cos(v.yaw||0)*dz)/Math.max(.001,d)<-.5;
 }
 // A swing that meets no one and reaches a solid leaves its mark there.
 const reach=victim?range:wallDistance(from,forward,range),wall=!victim&&reach<range;if(wall)to=from.map((v,i)=>v+forward[i]*reach);
 return {victim,zone:'melee',distance:victim?best:range,from,to,direction,heavy,backstab,wall};
}
export function equipWeapon(p,index,now){if(!Number.isInteger(index)||index<0||index>=WEAPONS.length||p.weapon===index)return false;p.weapon=index;p.reload=0;p.shots=0;p.recoilWeapon=index;p.equipUntil=now+(gunOf(p,index).equip??.3)*1000;return true;}
// Able to fire, the weapon's own cycle aside: the one wait a queued click may bridge.
export function mayAttack(p,now){const w=gunOf(p);return p.hp>0&&!p.reload&&now>=(p.equipUntil||0)&&(w.melee||p.ammo[p.weapon]>0);}
export function canAttack(p,now,heavy=false){return mayAttack(p,now)&&now>=(p.weaponReady?.[p.weapon]||0);}
