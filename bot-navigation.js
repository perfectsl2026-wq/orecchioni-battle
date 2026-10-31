import {blocked,onWorldChange,BOUNDS,MAPS,ACTIVE_MAP,groundHeight} from './shared.js?v=38.2';
import {accelerate,BOT_BRAKING} from './agent-motion.js?v=38.2';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const copy=p=>({x:p.x,z:p.z});
// V34: the answer does not depend on the order in which the samples are tested, so
// every eighth sample is probed first: a wall across the segment (at least ~1 m wide
// once inflated by the probe radius) usually shows up after a few probes instead of
// after walking up to it 12 cm at a time. The full pass then tests the remaining
// samples and the step heights, each floor height computed once and kept for the next.
export function walkClear(a,b,r=.46){
 const steps=Math.max(1,Math.ceil(distance(a,b)/.12)),dx=b.x-a.x,dz=b.z-a.z;
 for(let n=8;n<steps;n+=8)if(blocked(a.x+dx*n/steps,a.z+dz*n/steps,r))return false;
 let floor=0;
 for(let n=0;n<=steps;n++){
  const x=a.x+dx*n/steps,z=a.z+dz*n/steps;if((n%8!==0||n===0||n===steps)&&blocked(x,z,r))return false;
  const h=groundHeight(x,z);if(n>0&&Math.abs(h-floor)>.32)return false;floor=h;
 }
 return true;
}

// Finer graph with clearance; connectors use the actual collision radius.
// Inflating the starting position can otherwise forbid every escape from a wall.
const cells=[],lookup=new Map(),key=(x,z)=>x+','+z;let worldEpoch=0;
export function rebuildNavigation(){cells.length=0;lookup.clear();
for(let x=-Math.floor(BOUNDS.x*2);x<=Math.floor(BOUNDS.x*2);x++)for(let z=-Math.floor(BOUNDS.z*2);z<=Math.floor(BOUNDS.z*2);z++)if(!blocked(x/2,z/2,.54)){
 const c={x:x/2,z:z/2,id:cells.length,edges:[]};lookup.set(key(x,z),c.id);cells.push(c);
}
for(const c of cells)for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
 const id=lookup.get(key(c.x*2+dx,c.z*2+dz));
 if(id!==undefined&&walkClear(c,cells[id],.51))c.edges.push([id,Math.hypot(dx,dz)/2]);
}
}
rebuildNavigation();
class Heap{
 constructor(){this.a=[];}
 push(v){let i=this.a.push(v)-1;while(i){const p=(i-1)>>1;if(this.a[p].f<=v.f)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}
 pop(){const first=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.a[c+1].f<this.a[c].f)c++;if(this.a[c].f>=last.f)break;this.a[i]=this.a[c];i=c;}this.a[i]=last;}return first;}
 get length(){return this.a.length;}
}
// The closest cell (first in graph order on ties) that p can walk to. Candidates are
// tried nearest first, so the costly walkClear runs on a handful of cells instead of
// on every cell closer than the best found so far; after a few misses the rest are
// sorted once, which keeps the worst case linear-logarithmic.
let tried=new Uint8Array(0);
function nearest(p,connect=true){
 if(tried.length<cells.length)tried=new Uint8Array(cells.length);else tried.fill(0,0,cells.length);
 const d2=c=>(c.x-p.x)**2+(c.z-p.z)**2;
 for(let miss=0;miss<24;miss++){
  let best=null,score=Infinity;
  for(const c of cells){if(tried[c.id])continue;const d=d2(c);if(d<score){score=d;best=c;}}
  if(!best||!connect||walkClear(p,best,.4))return best;
  tried[best.id]=1;
 }
 const rest=cells.filter(c=>!tried[c.id]).sort((a,b)=>d2(a)-d2(b)||a.id-b.id);
 return rest.find(c=>walkClear(p,c,.4))||null;
}
export function projectGoal(goal){
 if(!blocked(goal.x,goal.z,.4))return copy(goal);
 const c=nearest(goal,false);return c?copy(c):null;
}
export function planRoute(from,requested){
 const to=projectGoal(requested);if(!to)return [];
 if(walkClear(from,to,.5))return [[from.x,from.z],[to.x,to.z]];
 const a=nearest(from),b=nearest(to);if(!a||!b)return [];
 const heap=new Heap(),cost=new Float64Array(cells.length).fill(Infinity),previous=new Int32Array(cells.length).fill(-1),closed=new Uint8Array(cells.length);
 cost[a.id]=0;heap.push({id:a.id,f:distance(a,b)});
 while(heap.length){
  const c=cells[heap.pop().id];if(closed[c.id])continue;closed[c.id]=1;if(c.id===b.id)break;
  for(const[id,w]of c.edges){const next=cost[c.id]+w;if(next<cost[id]){cost[id]=next;previous[id]=c.id;heap.push({id,f:next+distance(cells[id],b)});}}
 }
 if(!Number.isFinite(cost[b.id]))return [];
 const path=[];for(let id=b.id;id!==-1;id=previous[id])path.push([cells[id].x,cells[id].z]);path.reverse();
 if(distance(from,a)>.01)path.unshift([from.x,from.z]);
 if(distance(to,b)>.01&&walkClear(b,to,.4))path.push([to.x,to.z]);
 return path;
}
export function routeLength(path){let len=0;for(let i=1;i<path.length;i++)len+=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);return len;}

export class BotNavigator{
 constructor(id){
  this.id=id;this.velocity={x:0,z:0};this.goal=null;this.request=null;this.path=[];this.index=0;
  this.plannedAt=-Infinity;this.lastProgressAt=0;this.bestRemaining=Infinity;this.recoverUntil=0;
  this.recovery=null;this.recoveries=0;this.failed=false;this.routes=0;this.reached=false;this.look=null;this.moveOrigin=null;this.lastMovedAt=0;
  this.targetMemo={path:null};
 }
 plan(p,goal,now){
  if(this.request&&distance(this.request,goal)>.85)this.recoveries=0;
  this.request=copy(goal);this.goal=projectGoal(goal);this.path=planRoute(p,goal).map(([x,z])=>({x,z}));
  this.index=this.path.length>1?1:0;this.plannedAt=now;this.lastProgressAt=now;this.bestRemaining=Infinity;
  this.failed=!this.path.length;this.reached=false;this.routes++;
 }
 remaining(p){let d=this.path[this.index]?distance(p,this.path[this.index]):0;for(let i=this.index+1;i<this.path.length;i++)d+=distance(this.path[i-1],this.path[i]);return d;}
 target(p){
  // V34: a bot holding still on an unchanged route gets the answer it got last step;
  // the walkClear probes below depend only on its position, the route and the map.
  const memo=this.targetMemo;
  if(memo.path===this.path&&memo.index===this.index&&memo.x===p.x&&memo.z===p.z&&memo.world===worldEpoch){this.index=memo.next;return memo.q;}
  memo.path=this.path;memo.index=this.index;memo.x=p.x;memo.z=p.z;memo.world=worldEpoch;
  const q=this.pick(p);memo.next=this.index;memo.q=q;return q;
 }
 pick(p){
  // Progress is monotonic. Never return to a cell behind an already passed corner.
  while(this.index<this.path.length-1){
   const a=this.path[this.index],b=this.path[this.index+1],before=this.path[this.index-1]||p;
   const passed=(p.x-a.x)*(a.x-before.x)+(p.z-a.z)*(a.z-before.z)>0;
   if((distance(p,a)<.42||passed)&&walkClear(p,b,.4))this.index++;else break;
  }
  let q=this.path[this.index]||this.goal;
  for(let i=this.path.length-1;i>this.index;i--)if(walkClear(p,this.path[i],.5)){
   this.index=i;q=this.path[i];break;
  }
  // A short look-ahead rounds turns only when that chord is actually traversable.
  if(this.index<this.path.length-1&&distance(p,q)<1.1){
   const b=this.path[this.index+1],d=distance(q,b),r=Math.min(.7,d)/Math.max(d,.001);
   const look={x:q.x+(b.x-q.x)*r,z:q.z+(b.z-q.z)*r};
   if(walkClear(p,look,.47))q=look;
  }
  return q;
 }
 update(p,requested,players,now,dt,maxSpeed=4.3,faceTravel=false){
  let desired={x:0,z:0};this.reached=false;
  if(!this.moveOrigin){this.moveOrigin=copy(p);this.lastMovedAt=now;}
  if(distance(p,this.moveOrigin)>.25){this.moveOrigin=copy(p);this.lastMovedAt=now;}
  if(requested){
   const changed=!this.request||distance(requested,this.request)>.85;
   if(!this.goal||changed&&now-this.plannedAt>350){if(this.failed&&changed)this.lastMovedAt=now;this.plan(p,requested,now);}
   if(this.goal&&!this.failed){
    const q=this.target(p),d=distance(p,q),arrival=distance(p,this.goal);this.look=q;
    this.reached=arrival<.48;
    if(arrival>.22&&d>.02){
     let speed=Math.min(maxSpeed,Math.sqrt(2*BOT_BRAKING*Math.max(0,arrival-.2)));
     if(faceTravel){const facing=(-Math.sin(p.yaw)*(q.x-p.x)-Math.cos(p.yaw)*(q.z-p.z))/d;speed*=.2+.8*Math.max(0,facing);}
     desired={x:(q.x-p.x)/d*speed,z:(q.z-p.z)/d*speed};
    }
    const remaining=this.remaining(p);
    if(remaining<this.bestRemaining-.18){if(Number.isFinite(this.bestRemaining))this.recoveries=0;this.bestRemaining=remaining;this.lastProgressAt=now;}
    if(!this.reached&&maxSpeed>.5&&now-this.lastProgressAt>1500&&now>this.recoverUntil){
     // Physical radius is essential here: a legal point near a wall must be escapable.
     const options=[];for(let n=0;n<8;n++){
      const angle=n*Math.PI/4,point={x:p.x+Math.cos(angle)*.85,z:p.z+Math.sin(angle)*.85};
      if(walkClear(p,point,.4))options.push({point,score:distance(point,q)+n*.001});
     }
     options.sort((a,b)=>a.score-b.score);this.recovery=options[0]?.point||null;
     this.recoverUntil=now+650;this.lastProgressAt=now;this.recoveries++;
     if(this.recoveries>2){this.failed=true;}else this.plan(p,requested,now);
    }
   }
   if(now<this.recoverUntil&&this.recovery){const d=distance(p,this.recovery);if(d>.12)desired={x:(this.recovery.x-p.x)/d*1.7,z:(this.recovery.z-p.z)/d*1.7};}
   // Bounded separation and a deterministic passing side avoid head-on shuffling.
   for(const a of players){
    if(a.id===p.id||a.hp<=0)continue;const dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz);
    const speed=Math.hypot(desired.x,desired.z),ahead=speed>.1?(desired.x*(-dx)+desired.z*(-dz))/(speed*Math.max(.01,d)):0;
    if(d<2.2&&d>.01&&ahead>.65&&speed>1){const force=(2.2-d)*1.8;const vx=desired.x/speed,vz=desired.z/speed;desired.x+=vz*force;desired.z-=vx*force;}
    if(d<1.4&&d>.01){const force=(1.4-d)*3.2;desired.x+=dx/d*force;desired.z+=dz/d*force;}
    // Inside arm's reach a bot never closes in on a body (a teammate's camera included): the
    // approaching part of its motion is removed, so it slides past instead of through.
    if(d<.9&&d>.01){const nx=-dx/d,nz=-dz/d,toward=desired.x*nx+desired.z*nz;if(toward>0){desired.x-=nx*toward;desired.z-=nz*toward;}}
   }
   const magnitude=Math.hypot(desired.x,desired.z);if(magnitude>maxSpeed){desired.x*=maxSpeed/magnitude;desired.z*=maxSpeed/magnitude;}
   if(!this.reached&&maxSpeed>.5&&now-this.lastMovedAt>5000)this.failed=true;
  }else{this.lastProgressAt=now;this.lastMovedAt=now;this.bestRemaining=Infinity;}
  const speed=Math.hypot(this.velocity.x,this.velocity.z);
  if(speed>.3){const horizon=speed/(2*BOT_BRAKING)+dt+.05/speed;
   if(!walkClear(p,{x:p.x+this.velocity.x*horizon,z:p.z+this.velocity.z*horizon},.4))desired={x:0,z:0};
  }
  accelerate(this.velocity,desired,dt);
  // Slide along the real collision surface; do not trap the actor in an inflated band.
  if(blocked(p.x+this.velocity.x*dt,p.z+this.velocity.z*dt,.4)){
   const xFree=!blocked(p.x+this.velocity.x*dt,p.z,.4),zFree=!blocked(p.x,p.z+this.velocity.z*dt,.4);
   if(!xFree)this.velocity.x=0;if(!zFree)this.velocity.z=0;
   if(xFree&&zFree){if(Math.abs(this.velocity.x)>Math.abs(this.velocity.z))this.velocity.z=0;else this.velocity.x=0;}
  }
  return this.velocity;
 }
 debug(){return {goal:this.goal&&copy(this.goal),routes:this.routes,waypoints:Math.max(0,this.path.length-this.index),reached:this.reached,failed:this.failed,recoveries:this.recoveries};}
}

const AREA_CANDIDATES=[
 {x:-3,z:-18},{x:3,z:-18},{x:-16,z:-18},{x:16,z:-18},
 {x:-16,z:-11},{x:16,z:-11},{x:-6.5,z:-12.5},{x:6.5,z:-12.5},
 {x:-16,z:0},{x:16,z:0},{x:-10,z:0},{x:10,z:0},
 {x:-6,z:-7.5},{x:6,z:-7.5},{x:-4,z:0},{x:4,z:0},
 {x:-6,z:7.5},{x:6,z:7.5},{x:-6.5,z:12.5},{x:6.5,z:12.5},
 {x:-16,z:11},{x:16,z:11},{x:-16,z:18},{x:16,z:18},{x:-3,z:18},{x:3,z:18}
];
const candidates=()=>MAPS[ACTIVE_MAP].navAreas||AREA_CANDIDATES;
export const NAV_AREAS=candidates().filter(p=>!blocked(p.x,p.z,.54));
onWorldChange(()=>{worldEpoch++;rebuildNavigation();NAV_AREAS.splice(0,NAV_AREAS.length,...candidates().filter(p=>!blocked(p.x,p.z,.54)));});
