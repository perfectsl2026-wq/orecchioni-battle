import {eyeHeight,STANCE} from './player-feel.js?v=39.0';
import {WEAPONS,move,raySphere,wallDistance,penetrationAt} from './shared.js?v=39.0';

// Original tuning: a settled first shot, a repeatable spray, and a real cost to
// firing while running. The host uses the same rules for people and bots.
// `wallbang` is how much of a round's energy survives a penetrable surface (V31).
export const GUN_RULES=[
 {speed:5.1,accuracy:.0024,moving:.038,kick:.021,penetration:.5,wallbang:.3},
 {speed:4.9,accuracy:.007,moving:.032,kick:.010,penetration:.6,wallbang:.33},
 {speed:4.3,accuracy:.0028,moving:.055,kick:.022,penetration:.78,wallbang:.75},
 {speed:4.4,accuracy:.0022,moving:.048,kick:.016,penetration:.8,wallbang:.62},
 {speed:3.7,accuracy:.034,scoped:.00025,moving:.16,kick:.07,penetration:1,wallbang:.9},
 {speed:5.8,accuracy:0,moving:0,kick:0,penetration:1,wallbang:0}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function resetCombat(p){p.duck=0;p.jumpV=0;p.landedAt=-1e6;p.landingUntil=0;p.helmet=true;p.shots=0;p.recoilWeapon=p.weapon;p.lastShot=-1e6;p.vx=p.vz=p.speed=0;p.armor=100;p.received={};p.death=null;p.taggedUntil=0;p.equipUntil=0;p.weaponReady=WEAPONS.map(()=>0);}
export function movementScale(p,now){return now<(p.taggedUntil||0)?.45+.55*clamp(1-(p.taggedUntil-now)/220,0,1):1;}
export function movementSpeed(p,input={},now=Infinity){
 return GUN_RULES[p.weapon??3].speed*(1-(1-STANCE.speed)*clamp(p.duck||0,0,1))*(input.slow?.46:1)*movementScale(p,now);
}
function resolveMovement(p,vx,vz,dt){
 p.vx=vx;p.vz=vz;const x=p.x,z=p.z;move(p,vx*dt,vz*dt);
 if(Math.abs(p.x-x)<.00001)p.vx=0;if(Math.abs(p.z-z)<.00001)p.vz=0;
 p.speed=Math.hypot(p.x-x,p.z-z)/Math.max(dt,.001);return p;
}
// Navigation already brakes and avoids corners in world space. Preserve that
// steering, but use the same weapon, stance, hit slowdown and collision rules.
export function stepBotMovement(p,input,dt,now){
 const len=Math.max(1,Math.hypot(input.forward||0,input.side||0)),yaw=p.yaw||0;
 const vx=(-Math.sin(yaw)*(input.forward||0)+Math.cos(yaw)*(input.side||0))/len*4.7;
 const vz=(-Math.cos(yaw)*(input.forward||0)-Math.sin(yaw)*(input.side||0))/len*4.7;
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
  const reversing=p.vx*tx+p.vz*tz<0,accel=reversing?65:Math.hypot(tx,tz)<.01?27:38,distance=Math.hypot(tx-p.vx,tz-p.vz),a=Math.min(1,accel*dt/Math.max(distance,.00001));
  p.vx+=(tx-p.vx)*a;p.vz+=(tz-p.vz)*a;
 }
 return resolveMovement(p,p.vx,p.vz,dt);
}
// Authored angular control points (degrees); the first shot is settled.
// Patterns belong to this game. Crouching reduces inaccuracy, never the pattern.
const PATTERNS=[
 [[0,0],[1.6,0],[2.5,-.25],[3.2,.35]],
 [[0,0],[.65,0],[1.5,.1],[2.6,-.3],[3.5,.65],[4,-.7],[4.1,.9],[4,-.8]],
 [[0,0],[1.25,0],[2.8,.08],[4.4,-.15],[5.9,-.55],[7.2,-1],[8.3,-1.5],[8.9,-.6],[9.3,.8],[9.5,2.1],[9.4,3],[9.2,2.5],[9.1,.8],[9.1,-1.1],[9,-2.7],[8.9,-3.2]],
 [[0,0],[.9,0],[2,.05],[3.15,-.1],[4.3,-.35],[5.3,-.65],[6.15,-.9],[6.7,-.3],[7,.55],[7.2,1.45],[7.15,2],[7,1.6],[6.9,.45],[6.9,-.9],[6.8,-1.8],[6.8,-2]],
 [[0,0],[4.2,0]],[[0,0]]
];
export const RECOIL_STRENGTH=[.60,.62,.40,.40,.55,0],CAMERA_RECOIL=.72;
export function sprayOffset(index,shots){
 const points=PATTERNS[index],n=clamp(shots,0,index===0?3:index===4?1:29),at=n<7?n:7+(n-7)*(points.length-8)/22;
 const a=Math.min(points.length-1,Math.floor(Math.max(0,at))),b=Math.min(points.length-1,a+1),t=at-a;
 return {pitch:(points[a][0]+(points[b][0]-points[a][0])*t)*Math.PI/180*RECOIL_STRENGTH[index],yaw:(points[a][1]+(points[b][1]-points[a][1])*t)*Math.PI/180*RECOIL_STRENGTH[index]};
}
export function recoilIndex(p,now){
 const w=WEAPONS[p.weapon],gap=now-(p.lastShot??-1e6),delay=Math.max(100,w.rate*1000+45);
 // Short taps/bursts settle faster; sustained sprays retain a longer recovery.
 const recovery=p.weapon===4?200:85+100*clamp(((p.shots||0)-3)/10,0,1);
 const value=(p.shots||0)*Math.exp(-Math.max(0,gap-delay)/recovery);
 return value<.025?0:value;
}
export function recoilAt(p,now){return sprayOffset(p.weapon,recoilIndex(p,now));}
export function accuracyFor(p,now){
 const wi=p.weapon,r=GUN_RULES[wi],speed=Number.isFinite(p.speed)?p.speed:Math.hypot(p.vx||0,p.vz||0),duck=clamp(p.duck||0,0,1);
 const deadzone=wi===4?.18:wi===1?.32:wi===0?.30:.27;
 const moving=clamp((speed/r.speed-deadzone)/(1-deadzone),0,1),air=(p.y||0)-(p.groundY||0)>.001||Math.abs(p.jumpV||0)>.1;
 const base=(wi===4&&p.input?.aim?r.scoped:r.accuracy)*(1-duck*.27);
 const landing=clamp(((p.landingUntil||0)-now)/220,0,1)*.018;
 return base+r.moving*moving**1.6+(air?.055+Math.min(.15,Math.abs(p.jumpV||0)*.023):0)+landing+Math.min(.014,recoilIndex(p,now)*.0007);
}
export function shotParameters(p,now,random=Math.random){
 const wi=p.weapon;if(p.recoilWeapon!==wi)p.shots=0;
 p.recoilWeapon=wi;const shots=recoilIndex(p,now),kick=sprayOffset(wi,shots),spread=accuracyFor(p,now);
 const radius=Math.sqrt(random())*spread*.5,angle=random()*Math.PI*2;
 p.shots=shots+1;return {yaw:p.yaw+kick.yaw+Math.cos(angle)*radius,pitch:p.pitch+kick.pitch+Math.sin(angle)*radius,spread,kick};
}
export const HIT_MULTIPLIERS={head:4,chest:1,arms:1,stomach:1.25,legs:.75};
export function hitZones(p){
 const duck=clamp(p.duck||0,0,1),y=p.y||0,drop=duck*STANCE.drop;
 const zones=[['head',0,1.65-drop,.205],['chest',0,1.22-drop,.285],['stomach',0,.88-drop*.7,.265],['legs',-.14,.36-drop*.2,.215],['legs',.14,.36-drop*.2,.215],['arms',-.31,1.22-drop,.15],['arms',.31,1.22-drop,.15]];
 const c=Math.cos(p.yaw||0),s=Math.sin(p.yaw||0);
 return zones.map(([zone,side,h,r])=>({zone,center:[p.x+side*c,h+y,p.z-side*s],radius:r}));
}
// One hitscan leg: nearest body before the first solid.
function traceLeg(p,players,origin,d,range){
 let distance=wallDistance(origin,d,range),victim=null,zone='chest';
 for(const v of players){
  if(v.id===p.id||v.hp<=0||v.loading)continue;
  for(const part of hitZones(v)){
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
 const d=[-Math.sin(angles.yaw)*Math.cos(angles.pitch),Math.sin(angles.pitch),-Math.cos(angles.yaw)*Math.cos(angles.pitch)],origin=[p.x,eyeHeight(p),p.z],range=WEAPONS[p.weapon].range;
 const first=traceLeg(p,players,origin,d,range);
 let {victim,zone,distance}=first,through=null,scale=1,to=origin.map((v,i)=>v+d[i]*distance);
 const wallbang=GUN_RULES[p.weapon]?.wallbang||0;
 if(first.wall&&wallbang>0){
  const pen=penetrationAt(origin,d,first.distance);
  if(pen&&pen.scale*wallbang>=.1){
   const exitPoint=origin.map((v,i)=>v+d[i]*(pen.exit+.01)),second=traceLeg(p,players,exitPoint,d,range-pen.exit);
   through=[to,exitPoint];scale=pen.scale*wallbang;victim=second.victim;zone=second.zone;distance=pen.exit+.01+second.distance;to=exitPoint.map((v,i)=>v+d[i]*second.distance);
  }
 }
 return {victim,zone,distance,from:origin,to,direction:d,through,scale};
}
export function damageFor(index,zone,armor=0,distance=0,helmet=true){
 const falloff=[.92,.84,.98,.97,.99,1][index]**(Math.max(0,distance)/25.4);
 const raw=WEAPONS[index].damage*(HIT_MULTIPLIERS[zone]??1)*falloff,protectedHit=zone!=='legs'&&(zone!=='head'||helmet)&&armor>0;
 const reduced=protectedHit?raw*GUN_RULES[index].penetration:raw,cost=(raw-reduced)*.5;
 const damage=protectedHit&&cost>armor?raw-armor*2:reduced;
 return {damage:Math.floor(damage),armor:Math.max(0,armor-cost)};
}
export function applyHit(victim,shooter,zone,now,melee=null,distance=0,scale=1){
 const hit=melee?{damage:melee.backstab&&melee.heavy?140:melee.heavy?65:35,armor:victim.armor||0}:damageFor(shooter.weapon,zone,victim.armor||0,distance,victim.helmet!==false);if(scale<1)hit.damage=Math.floor(hit.damage*scale);const damage=Math.min(victim.hp,hit.damage);
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
 for(const v of players){if(v.id===p.id||v.hp<=0||v.loading)continue;const target=[v.x,1.18+(v.y||0)-(v.duck||0)*STANCE.drop,v.z],delta=target.map((a,i)=>a-from[i]),distance=Math.hypot(...delta),dir=delta.map(a=>a/Math.max(.001,distance));
  if(distance>range+.25||distance>=best||dir.reduce((sum,a,i)=>sum+a*forward[i],0)<Math.cos(.58)||wallDistance(from,dir,distance)<distance-.04)continue;
  best=distance;victim=v;to=target;direction=dir;const dx=p.x-v.x,dz=p.z-v.z,d=Math.hypot(dx,dz);backstab=(-Math.sin(v.yaw||0)*dx-Math.cos(v.yaw||0)*dz)/Math.max(.001,d)<-.5;
 }
 return {victim,zone:'melee',distance:victim?best:range,from,to,direction,heavy,backstab};
}
export function equipWeapon(p,index,now){if(!Number.isInteger(index)||index<0||index>=WEAPONS.length||p.weapon===index)return false;p.weapon=index;p.reload=0;p.shots=0;p.recoilWeapon=index;p.equipUntil=now+300;return true;}
export function canAttack(p,now,heavy=false){const w=WEAPONS[p.weapon];return p.hp>0&&!p.reload&&now>=(p.equipUntil||0)&&now>=(p.weaponReady?.[p.weapon]||0)&&(w.melee||p.ammo[p.weapon]>0);}
