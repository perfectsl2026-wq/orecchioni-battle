// Weapons on the ground. A primary drops where its owner dies or presses G; anyone
// without a primary picks it up by walking over it, anyone with one swaps by holding
// E on it. Drops live in the networked state and vanish when the round resets.
import {WEAPONS,groundHeight} from './shared.js?v=39.0';
export const PICKUP={reach:1.15,swapReach:1.6};
export function dropWeapon(state,p,now,{weapon=p.primary,ammo}={}){
 if(!Number.isInteger(weapon)||weapon<1||weapon>4)return null;
 const d={id:++state.utilitySerial,weapon,ammo:ammo??p.ammo[weapon]??WEAPONS[weapon].mag,x:p.x,z:p.z,y:groundHeight(p.x,p.z),born:now,yaw:p.yaw||0,by:p.id};
 (state.drops??=[]).push(d);if(p.primary===weapon)p.primary=null;if(p.weapon===weapon)p.weapon=0;return d;
}
// Nearest drop to a player within reach, or null.
export function dropNear(state,p,reach=PICKUP.swapReach){
 let best=null,score=Infinity;for(const d of state.drops||[]){if(d.by===p.id&&state.now-d.born<1500)continue;const dist=Math.hypot(d.x-p.x,d.z-p.z);if(dist<reach&&dist<score&&Math.abs((d.y||0)-(p.y||0))<1.2){score=dist;best=d;}}return best;
}
function take(state,p,d){
 p.primary=d.weapon;p.ammo[d.weapon]=d.ammo;p.weapon=d.weapon;p.equipUntil=Math.max(p.equipUntil||0,state.now+300);state.drops=state.drops.filter(x=>x.id!==d.id);
}
// Host step: automatic pickup for empty hands, E to swap. Returns the pickups made.
export function updatePickups(state,now,{economy=true}={}){
 const taken=[];if(!economy||!(state.drops||[]).length)return taken;
 for(const p of Object.values(state.players)){
  if(p.hp<=0||p.loading)continue;
  if(!Number.isInteger(p.primary)){const d=dropNear(state,p,PICKUP.reach);if(d){take(state,p,d);taken.push({player:p.id,weapon:d.weapon});}}
  else if(p.input?.interact&&!p.input.fire&&now-(p.lastSwap||-Infinity)>600){const d=dropNear(state,p);if(d&&d.weapon!==p.primary){const old=p.primary,ammo=p.ammo[old];take(state,p,d);state.drops.push({id:++state.utilitySerial,weapon:old,ammo,x:p.x,z:p.z,y:groundHeight(p.x,p.z),born:now,yaw:p.yaw||0,by:p.id});p.lastSwap=now;taken.push({player:p.id,weapon:d.weapon,swapped:old});}}
 }
 return taken;
}
