import {weaponAllowed} from './match-rules.js?v=42.0';

export const INPUT_TIMEOUT_MS=350,CLICK_WAIT_MS=300,CLICK_QUEUE=3;
// One-shot actions. The guest counts them and every packet carries the counters, so a packet
// lost on the fast channel is repaired by the next one and a click can never fire twice.
export const PULSES=['tap','reload','secondary','jump','flash','smoke','he','incendiary','drop','bomb'];
const axis=v=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
const wrapped=v=>Math.atan2(Math.sin(v),Math.cos(v)),tilt=v=>Math.max(-1.45,Math.min(1.45,v));
export function cleanInput(value,mode,weapon=3){
 const v=value&&typeof value==='object'?value:{};
 return {forward:axis(v.forward),side:axis(v.side),slow:v.slow===true,crouch:v.crouch===true,
  flash:v.flash===true,smoke:v.smoke===true,smokePower:Number.isFinite(v.smokePower)?Math.max(.3,Math.min(1,v.smokePower)):1,he:v.he===true,incendiary:v.incendiary===true,drop:v.drop===true,bomb:v.bomb===true,interact:v.interact===true,fire:v.fire===true,tap:false,secondary:v.secondary===true,reload:v.reload===true,jump:v.jump===true,aim:v.aim===true,
  yaw:Number.isFinite(v.yaw)?wrapped(v.yaw):null,
  pitch:Number.isFinite(v.pitch)?tilt(v.pitch):null,
  // The host time of the bodies the sender was drawing when the input was built: lag compensation rewinds to it.
  at:Number.isFinite(v.at)?v.at:null,
  weapon:weaponAllowed(mode,v.weapon)?v.weapon:weapon};
}
export function clearPulses(input){for(const key of PULSES)input[key]=false;if(input.fire!==undefined)input.fire=false;return input;}
// Inputs contain intentions only: the host computes position, jump height,
// stance and damage. Life/sequence checks discard queued packets after respawn;
// on the unordered fast channel the same check drops late arrivals.
export class InputChannel{
 constructor(life){this.life=life;this.seq=-1;this.received=-Infinity;this.value={};this.counts=PULSES.map(()=>0);this.clicks=[];this.lastClick=0;}
 accept(packet,mode,weapon,now,bound=v=>v){
  if(!packet||packet.life!==this.life||!Number.isSafeInteger(packet.seq)||packet.seq<0||packet.seq<=this.seq)return null;
  const next=cleanInput(packet,mode,weapon);
  if(now-this.received<=INPUT_TIMEOUT_MS){for(const key of PULSES)next[key]||=this.value[key]===true;}
  if(Array.isArray(packet.n))PULSES.forEach((key,n)=>{const count=packet.n[n];if(Number.isSafeInteger(count)&&count>this.counts[n]){this.counts[n]=count;next[key]=true;}});
  // The aim and time of each click itself, so a flick lands where the player clicked and clicks that a
  // stall delivers together still count: [number, yaw, pitch, at, may wait] for the latest few clicks.
  const s=packet.s;if(Array.isArray(s)&&s.length<=CLICK_QUEUE*5&&s.length%5===0&&s.every(Number.isFinite))for(let n=0;n<s.length;n+=5)if(s[n]>this.lastClick){this.lastClick=s[n];this.clicks.push({yaw:wrapped(s[n+1]),pitch:tilt(s[n+2]),at:bound(s[n+3]),wait:s[n+4]===1,weapon:next.weapon,seen:now});if(this.clicks.length>CLICK_QUEUE)this.clicks.shift();}
  this.seq=packet.seq;this.received=now;this.value=next;return next;
 }
 // The click to fire now, if any. A click the weapon cannot serve yet waits its turn for a moment, when it came
 // at the weapon's own pace on the guest: the host's rate of fire never changes, a click is only served late instead of lost.
 // `cycling` says only the weapon's cycle stands in the way: a reload, a draw or an empty magazine refuses the click for good.
 nextClick(now,ready,weapon,cycling=true){const c=this.clicks;while(c.length&&(now-c[0].seen>CLICK_WAIT_MS||c[0].weapon!==weapon||!ready&&!(cycling&&c[0].wait)))c.shift();return ready?c.shift()||null:null;}
 read(now){
  if(now-this.received>INPUT_TIMEOUT_MS)this.value=cleanInput(null,'deathmatch',this.value.weapon);
  return this.value;
 }
}
// Guest side only: the host moves exactly as it always did. The guest remembers where it stood,
// compares the host's position with its own at the same moment of the input timeline and works
// the difference off slowly through the normal collision move, so it can never enter a solid.
const TRAIL=240,SENT=48;
export const DRIFT={dead:.05,rateGain:2,rateMin:.25,rateMax:1.4,snap:4,heightDead:.2,heightRate:3,refused:.35};
// Guest ammo: a predicted shot counts against the host's number until that number shows it. The echo
// proves the shot was fired, but the count comes in a later delta, so the echo cannot let it go.
export class AmmoLedger{
 constructor(){this.known=[];this.shots=[];}
 reset(){this.known.length=0;this.shots.length=0;}
 fired(weapon,t){(this.shots[weapon]??=[]).push(t);}
 expire(t,age){for(const list of this.shots)while(list?.length&&t-list[0]>age)list.shift();}
 apply(ammo){
  for(let w=0;w<ammo.length;w++){
   const count=ammo[w],was=this.known[w],list=this.shots[w];this.known[w]=count;if(!list?.length)continue;
   if(count>was)list.length=0;else if(count<was)list.splice(0,was-count);
   ammo[w]=Math.max(0,count-list.length);
  }
 }
}
export class DriftCorrector{
 constructor(){this.times=new Float64Array(TRAIL);this.xs=new Float64Array(TRAIL);this.zs=new Float64Array(TRAIL);this.hs=new Float64Array(TRAIL);this.seqs=new Int32Array(SENT);this.sentAt=new Float64Array(SENT);this.reset();}
 reset(){this.head=0;this.count=0;this.sentHead=0;this.seqs.fill(-1);this.ox=this.oz=0;this.ex=this.ez=0;this.eh=0;this.oh=0;this.refusals=0;}
 noteSend(seq,t){this.seqs[this.sentHead]=seq&0xffff;this.sentAt[this.sentHead]=t;this.sentHead=(this.sentHead+1)%SENT;}
 noteStep(t,x,z,height=0){this.times[this.head]=t;this.xs[this.head]=x-this.ox;this.zs[this.head]=z-this.oz;this.hs[this.head]=height-this.oh;this.head=(this.head+1)%TRAIL;this.count=Math.min(TRAIL,this.count+1);}
 // Own position at time t, interpolated; null when t is outside the trail.
 positionAt(t){
  let newer=-1;for(let n=1;n<=this.count;n++){const i=(this.head-n+TRAIL)%TRAIL;if(this.times[i]<=t){if(newer<0)return n===1?{x:this.xs[i]+this.ox,z:this.zs[i]+this.oz,height:this.hs[i]+this.oh}:null;const u=(t-this.times[i])/Math.max(1e-6,this.times[newer]-this.times[i]);return {x:this.xs[i]+(this.xs[newer]-this.xs[i])*u+this.ox,z:this.zs[i]+(this.zs[newer]-this.zs[i])*u+this.oz,height:this.hs[i]+(this.hs[newer]-this.hs[i])*u+this.oh};}newer=i;}
  return null;
 }
 // Error against a host position that has seen `ack` for `age` ms. Returns its size, or null when unknown.
 measure(ack,age,hostX,hostZ,hostHeight=null){
  let sent=-1;for(let n=1;n<=SENT;n++){const i=(this.sentHead-n+SENT)%SENT;if(this.seqs[i]===ack){sent=this.sentAt[i];break;}}
  if(sent<0)return null;const own=this.positionAt(sent+age);if(!own)return null;
  this.ex=hostX-own.x;this.ez=hostZ-own.z;if(hostHeight!==null){this.eh=hostHeight-own.height;this.refusals=hostHeight<.02&&own.height>DRIFT.refused?this.refusals+1:0;}return Math.hypot(this.ex,this.ez);
 }
 // Height above the floor is the host's too. Both sides land on the same floor, so the only errors worth a correction
 // are in the air: a jump the host refused (it stays down over two looks, so a packet still in flight never counts) and a lower arc.
 stepHeight(dt,height){
  if(height<=0)this.eh=0;if(Math.abs(this.eh)<DRIFT.heightDead)return 0;
  const s=Math.sign(this.eh)*Math.min(Math.abs(this.eh),Math.max(.5,Math.min(DRIFT.heightRate,Math.abs(this.eh)*4))*dt);this.eh-=s;this.oh+=s;return s;
 }
 setError(dx,dz){this.ex=dx;this.ez=dz;}
 // The step to try now, or null inside the dead zone. Report what really moved with applied().
 step(dt){
  const e=Math.hypot(this.ex,this.ez);if(e<DRIFT.dead)return null;
  const s=Math.min(e,Math.max(DRIFT.rateMin,Math.min(DRIFT.rateMax,e*DRIFT.rateGain))*dt);return {x:this.ex/e*s,z:this.ez/e*s};
 }
 applied(dx,dz){this.ex-=dx;this.ez-=dz;this.ox+=dx;this.oz+=dz;}
}
