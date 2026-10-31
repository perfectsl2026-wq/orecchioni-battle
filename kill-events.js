export const KILL_FEED_MS=8000;
const valid=e=>e?.kind==='kill'&&typeof e.killerId==='string'&&typeof e.victimId==='string'&&Number.isFinite(e.time)&&Number.isInteger(e.victim?.life);
export function recordKill(state,e){
 if(!valid(e))return false;
 e.matchStarted=state.started;e.eventId=state.started+':'+e.victimId+':'+e.victim.life;
 state.killEvents??=[];
 if(state.killEvents.some(v=>v.eventId===e.eventId))return false;
 state.killEvents=state.killEvents.filter(v=>e.time-v.time<=KILL_FEED_MS);state.killEvents.push(e);if(state.killEvents.length>16)state.killEvents.shift();return true;
}
export class KillLedger{
 constructor(){this.seen=new Set();}
 clear(){this.seen.clear();}
 receive(e,state,now,present){
  if(!valid(e)||e.matchStarted!==state.started||typeof e.eventId!=='string'||this.seen.has(e.eventId))return false;
  this.seen.add(e.eventId);if(this.seen.size>128)this.seen.delete(this.seen.values().next().value);
  const age=now-e.time;if(age>KILL_FEED_MS||age < -5000)return false;
  present(e,Math.max(0,age));return true;
 }
 reconcile(state,now,present){for(const e of state.killEvents||[])this.receive(e,state,now,present);}
}
