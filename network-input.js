import {weaponAllowed} from './match-rules.js?v=38.3';

export const INPUT_TIMEOUT_MS=350;
const axis=v=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
export function cleanInput(value,mode,weapon=3){
 const v=value&&typeof value==='object'?value:{};
 return {forward:axis(v.forward),side:axis(v.side),slow:v.slow===true,crouch:v.crouch===true,
  flash:v.flash===true,smoke:v.smoke===true,he:v.he===true,incendiary:v.incendiary===true,drop:v.drop===true,interact:v.interact===true,fire:v.fire===true,secondary:v.secondary===true,reload:v.reload===true,jump:v.jump===true,aim:v.aim===true,
  yaw:Number.isFinite(v.yaw)?Math.atan2(Math.sin(v.yaw),Math.cos(v.yaw)):null,
  pitch:Number.isFinite(v.pitch)?Math.max(-1.45,Math.min(1.45,v.pitch)):null,
  // The sender's estimate of host time when the input was built: lag compensation rewinds to it.
  at:Number.isFinite(v.at)?v.at:null,
  weapon:weaponAllowed(mode,v.weapon)?v.weapon:weapon};
}
// Inputs contain intentions only: the host computes position, jump height,
// stance and damage. Life/sequence checks discard queued packets after respawn.
export class InputChannel{
 constructor(life){this.life=life;this.seq=-1;this.received=-Infinity;this.value={};}
 accept(packet,mode,weapon,now){
  if(!packet||packet.life!==this.life||!Number.isSafeInteger(packet.seq)||packet.seq<0||packet.seq<=this.seq)return null;
  const next=cleanInput(packet,mode,weapon);
  if(now-this.received<=INPUT_TIMEOUT_MS)for(const key of ['reload','secondary','jump','flash','smoke','he','incendiary','drop'])next[key]||=this.value[key]===true;
  this.seq=packet.seq;this.received=now;this.value=next;return next;
 }
 read(now){
  if(now-this.received>INPUT_TIMEOUT_MS)this.value=cleanInput(null,'deathmatch',this.value.weapon);
  return this.value;
 }
}
