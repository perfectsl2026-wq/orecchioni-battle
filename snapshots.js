const lerp=(a,b,t)=>a+(b-a)*t;
const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
// Buffer actual snapshots rather than repeatedly easing toward the newest packet.
// The playout clock advances with real time and only leans towards the arrival-based target,
// so a late packet does not move bodies backward and forward.
export const SNAPSHOT_DELAY_MS=100;
export class SnapshotBuffer{
 constructor(delay=SNAPSHOT_DELAY_MS){this.delay=delay;this.clear();}
 clear(){this.frames=[];this.play=null;this.playedAt=0;this.time=null;}
 push(state,receivedAt){
  const time=state.now;if(!Number.isFinite(time))return;
  if(this.frames.length&&time<=this.frames.at(-1).time)return;
  this.frames.push({time,receivedAt,players:state.players});if(this.frames.length>14)this.frames.shift();
 }
 sample(receivedNow){
  const last=this.frames.at(-1);if(!last)return null;
  const target=last.time+Math.max(0,receivedNow-last.receivedAt)-this.delay;
  if(this.play===null||Math.abs(target-this.play)>250)this.play=target;
  else{const dt=Math.max(0,receivedNow-this.playedAt);this.play+=dt;this.play+=dt*Math.max(-.1,Math.min(.1,(target-this.play)*.002));}
  this.playedAt=receivedNow;const time=this.time=Math.min(this.play,last.time);
  let a=this.frames[0],b=last;for(let n=1;n<this.frames.length;n++)if(this.frames[n].time>=time){a=this.frames[n-1];b=this.frames[n];break;}
  const t=a===b?1:Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time))),players={};
  for(const[id,next]of Object.entries(b.players)){
   const previous=a.players[id];
   if(!previous||previous.life!==next.life||previous.hp<=0||next.hp<=0){players[id]=next;continue;}
   players[id]={...next,x:lerp(previous.x,next.x,t),y:lerp(previous.y||0,next.y||0,t),groundY:lerp(previous.groundY||0,next.groundY||0,t),z:lerp(previous.z,next.z,t),
    duck:lerp(previous.duck||0,next.duck||0,t),yaw:angle(previous.yaw,next.yaw,t),pitch:lerp(previous.pitch||0,next.pitch||0,t)};
  }
  return players;
 }
}
