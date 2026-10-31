// V31 lag compensation, in the Valve mould. The host keeps a short history of every
// body's position; a shot from a remote player is traced against the world as that
// player saw it when they clicked (their input carries their estimate of host time),
// never more than REWIND_MAX_MS in the past. Damage still lands on the live body.
export const REWIND_MAX_MS=250,HISTORY_MS=400;
const histories=new Map();
export function clearHistory(){histories.clear();}
// Call once per host tick after movement: one sample per player per tick.
export function recordPositions(state,now){
 const live=new Set();
 for(const p of Object.values(state.players)){live.add(p.id);let h=histories.get(p.id);if(!h||h.life!==p.life){h={life:p.life,samples:[]};histories.set(p.id,h);}
  const s=h.samples;if(s.length&&s[s.length-1].t>=now)continue;s.push({t:now,x:p.x,y:p.y||0,z:p.z,yaw:p.yaw||0,duck:p.duck||0,hp:p.hp});
  while(s.length>2&&now-s[0].t>HISTORY_MS)s.shift();}
 for(const id of histories.keys())if(!live.has(id))histories.delete(id);
}
// Body as it was at `at`: interpolated between the two samples around it.
export function sampleAt(p,at){
 const h=histories.get(p.id);if(!h||h.life!==p.life||!h.samples.length)return null;const s=h.samples;
 if(at<=s[0].t)return s[0];if(at>=s[s.length-1].t)return s[s.length-1];
 let i=1;while(i<s.length-1&&s[i].t<at)i++;const a=s[i-1],b=s[i],u=(at-a.t)/Math.max(1e-6,b.t-a.t);
 return {t:at,x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,z:a.z+(b.z-a.z)*u,yaw:a.yaw+Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw))*u,duck:a.duck+(b.duck-a.duck)*u,hp:u<.5?a.hp:b.hp};
}
// Players as targets for a shot fired at `at` by `shooter`: everyone else is rewound,
// the shooter and anyone without history stay where they are. Returns shallow
// copies, so the caller applies damage to state.players[id].
export function rewoundPlayers(players,shooter,at,now){
 const t=Math.max(now-REWIND_MAX_MS,Math.min(now,at));if(!Number.isFinite(t)||t>=now-1)return players;
 return players.map(p=>{if(p===shooter||p.id===shooter?.id)return p;const s=sampleAt(p,t);return s?{...p,x:s.x,y:s.y,z:s.z,yaw:s.yaw,duck:s.duck}:p;});
}
export const rewindMs=(at,now)=>Number.isFinite(at)?Math.max(0,Math.min(REWIND_MAX_MS,now-at)):0;
