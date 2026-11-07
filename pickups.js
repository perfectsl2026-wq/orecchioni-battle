// Weapons on the ground. A primary drops where its owner dies or is tossed ahead with T;
// anyone without a primary picks it up by walking over it, anyone with one swaps by holding
// E on it. Drops live in the networked state and vanish when the round resets.
import {groundHeight,wallDistance,blocked} from './shared.js?v=42.0';
import {gunOf} from './weapon-stats.js?v=42.0';
import {pinArms} from './economy.js?v=42.0';
export const PICKUP={reach:1.15,swapReach:1.6,ownerClear:2,toss:1.5};
// Where something tossed ahead of a player lands: short of any wall, never inside a solid.
export function tossSpot(p,distance=PICKUP.toss){
 const dx=-Math.sin(p.yaw||0),dz=-Math.cos(p.yaw||0),reach=Math.min(distance,wallDistance([p.x,(p.y||0)+1,p.z],[dx,0,dz],distance+.5)-.45),x=p.x+dx*reach,z=p.z+dz*reach;
 return reach<.3||blocked(x,z)?{x:p.x,z:p.z}:{x,z};
}
export function dropWeapon(state,p,now,{weapon=p.primary,ammo,toss=false}={}){
 if(!Number.isInteger(weapon)||weapon<1||weapon>4)return null;
 const spot=toss?tossSpot(p):p,d={id:++state.utilitySerial,weapon,ammo:ammo??p.ammo[weapon]??gunOf(p,weapon).mag,x:spot.x,z:spot.z,y:groundHeight(spot.x,spot.z),born:now,yaw:p.yaw||0,by:p.id};
 // V42 b5: a drop keeps the design it was paid as (economy.js p.arms), the stock one too, and whoever takes it fires that design.
 if(p.arms)d.model=p.arms[weapon]||'stock';(state.drops??=[]).push(d);if(p.primary===weapon){p.primary=null;if(p.arms)delete p.arms[weapon];}if(p.weapon===weapon){p.weapon=0;p.reload=0;p.reloadStart=0;}return d;
}
// Nearest drop a player could actually take, or null: never the model already owned, and
// never one's own drop until they have walked clear of it.
export function dropNear(state,p,reach=PICKUP.swapReach){
 let best=null,score=Infinity;for(const d of state.drops||[]){if(d.by===p.id||d.weapon===p.primary)continue;const dist=Math.hypot(d.x-p.x,d.z-p.z);if(dist<reach&&dist<score&&Math.abs((d.y||0)-(p.y||0))<1.2){score=dist;best=d;}}return best;
}
function take(state,p,d){
 if(p.weapon!==d.weapon){p.reload=0;p.reloadStart=0;}if(Number.isInteger(p.primary)&&p.arms)delete p.arms[p.primary];p.primary=d.weapon;(p.arms??={})[d.weapon]=d.model||'stock';pinArms(state,p);p.ammo[d.weapon]=Math.min(d.ammo,gunOf(p,d.weapon).mag);p.weapon=d.weapon;p.equipUntil=Math.max(p.equipUntil||0,state.now+300);state.drops=state.drops.filter(x=>x.id!==d.id);
}
// Host step: automatic pickup for empty hands, E to swap. Returns the pickups made.
// `busy` marks a player whose held E means something else (plant, defuse): the floor waits.
export function updatePickups(state,now,{economy=true,busy=null}={}){
 const taken=[];if(!economy||!(state.drops||[]).length)return taken;
 for(const d of state.drops)if(d.by){const o=state.players[d.by];if(!o||o.hp<=0||Math.hypot(d.x-o.x,d.z-o.z)>PICKUP.ownerClear)d.by=null;}
 for(const p of Object.values(state.players)){
  if(p.hp<=0||p.loading||p.away||p.input?.interact&&busy?.(p))continue;
  if(!Number.isInteger(p.primary)){const d=dropNear(state,p,PICKUP.reach);if(d){take(state,p,d);taken.push({player:p.id,weapon:d.weapon});}}
  else if(p.input?.interact&&!p.input.fire&&now-(p.lastSwap||-Infinity)>600){const d=dropNear(state,p);if(d){const old=p.primary,ammo=p.ammo[old],model=p.arms?.[old];take(state,p,d);state.drops.push({id:++state.utilitySerial,weapon:old,ammo,x:p.x,z:p.z,y:groundHeight(p.x,p.z),born:now,yaw:p.yaw||0,by:p.id,...(p.arms?{model:model||'stock'}:{})});p.lastSwap=now;taken.push({player:p.id,weapon:d.weapon,swapped:old});}}
 }
 return taken;
}
