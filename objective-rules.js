import {MAPS,wallDistance,groundHeight} from './shared.js?v=40.0';
import {eyeHeight} from './player-feel.js?v=40.0';
import {bloom} from './smoke-rules.js?v=40.0';
import {detonate} from './blast-rules.js?v=40.0';
import {ECONOMY,economyOn,give} from './economy.js?v=40.0';
export const BOMB={plantMs:3000,defuseMs:5000,fuseMs:40000,reach:2.5};
export const objectiveEnabled=s=>!!MAPS[s.map]?.sites?.length&&s.mode==='demolition'&&!s.preview;
export const flashEnabled=s=>!!MAPS[s.map]?.utility;
// Sides swap at half time: after six rounds of a first-to-seven, eight of a first-to-nine.
export const attackFor=state=>Math.floor((state.round-1)/Math.max(1,(state.rules?.target||7)-1))%2?'blue':'orange';
const sitesOf=state=>MAPS[state.map]?.sites||[];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function resetObjective(state){
 state.grenades=[];state.smokes=[];state.fires=[];state.drops=[];state.utilitySerial=state.utilitySerial||0;
 if(!objectiveEnabled(state)){state.objective=null;return;}
 state.attackTeam=attackFor(state);
 const carrier=Object.values(state.players).filter(p=>!p.loading&&p.hp>0&&p.team===state.attackTeam).sort((a,b)=>Number(!!a.bot)-Number(!!b.bot)||a.id.localeCompare(b.id))[0];
 state.objective={status:carrier?'carried':'dropped',carrierId:carrier?.id||null,x:carrier?.x||0,z:carrier?.z||0,site:null,actorId:null,actionStarted:0,progress:0,explodeAt:0};
}
function interrupt(o){o.actorId=null;o.actionStarted=0;o.progress=0;}
export function updateObjective(state,now){
 if(!objectiveEnabled(state)||state.phase!=='live')return;const o=state.objective;if(!o)return;
 if(o.status==='planted'&&now>=o.explodeAt){o.status='exploded';interrupt(o);return;}
 const players=Object.values(state.players).filter(p=>!p.loading&&p.hp>0);
 if(o.status==='carried'){
  const carrier=players.find(p=>p.id===o.carrierId);
  if(carrier){o.x=carrier.x;o.z=carrier.z;}else{o.status='dropped';o.carrierId=null;interrupt(o);}
 }
 if(o.status==='dropped'){
  const p=players.find(p=>p.team===state.attackTeam&&distance(p,o)<1.4);
  if(p){o.status='carried';o.carrierId=p.id;o.x=p.x;o.z=p.z;}
 }
 const actor=players.find(p=>p.input?.interact&&!p.input.fire&&!p.input.secondary&&now-(p.lastShot??-Infinity)>120&&!p.reload&&(p.speed||0)<.5&&(p.y||0)-(p.groundY||0)<.05&&now>=(p.equipUntil||0)&&
  (o.status==='carried'?p.id===o.carrierId&&sitesOf(state).some(s=>distance(p,s)<=s.radius):o.status==='planted'&&p.team!==state.attackTeam&&Math.hypot(distance(p,o),(p.y||0)-groundHeight(o.x,o.z))<=BOMB.reach&&wallDistance([p.x,eyeHeight(p),p.z],direction(p,o),Math.hypot(distance(p,o),eyeHeight(p)-(groundHeight(o.x,o.z)+.18)))>=Math.hypot(distance(p,o),eyeHeight(p)-(groundHeight(o.x,o.z)+.18))-.05));
 if(!actor){interrupt(o);return;}
 if(o.actorId!==actor.id){o.actorId=actor.id;o.actionStarted=now;o.progress=0;}
 // A defuse kit halves the defuse, as in CS.
 const duration=o.status==='carried'?BOMB.plantMs:actor.kit?BOMB.defuseMs/2:BOMB.defuseMs;o.progress=Math.min(1,(now-o.actionStarted)/duration);
 if(o.progress<1)return;
 if(o.status==='carried'){o.status='planted';o.site=sitesOf(state).find(s=>distance(actor,s)<=s.radius).id;o.x=actor.x;o.z=actor.z;o.carrierId=null;o.plantedAt=now;o.explodeAt=now+BOMB.fuseMs;if(economyOn(state))give(actor,ECONOMY.plant);}
 else o.status='defused';interrupt(o);
}
function direction(p,o){const v=[o.x-p.x,groundHeight(o.x,o.z)+.18-eyeHeight(p),o.z-p.z],length=Math.hypot(...v);return v.map(x=>x/Math.max(.001,length));}
export function objectiveResult(state,now,alive){
 const o=state.objective,attack=state.attackTeam,defend=attack==='blue'?'orange':'blue';
 if(o?.status==='exploded')return {winner:attack,reason:'BOMBA ESPLOSA'};
 if(o?.status==='defused')return {winner:defend,reason:'BOMBA DISINNESCATA'};
 if(!alive[defend])return {winner:attack,reason:'DIFENSORI ELIMINATI'};
 if(o?.status==='planted')return null;
 if(!alive[attack])return {winner:defend,reason:'ATTACCANTI ELIMINATI'};
 if(now>=state.roundEnds)return {winner:defend,reason:'SITO DIFESO · TEMPO SCADUTO'};
 return null;
}
export function throwFlash(state,p,now){
 if(!flashEnabled(state)||p.hp<=0||!(Number.isInteger(p.flashes)&&p.flashes>0)||now<(p.flashReady||0)||p.reload||now<(p.equipUntil||0))return null;
 p.flashes--;p.flashReady=now+1000;p.equipUntil=now+350;
 const cp=Math.cos(p.pitch||0),v=[-Math.sin(p.yaw)*cp,Math.sin(p.pitch||0),-Math.cos(p.yaw)*cp];
 const g={id:++state.utilitySerial,owner:p.id,x:p.x,y:eyeHeight(p),z:p.z,vx:v[0]*14,vy:v[1]*14+2.5,vz:v[2]*14,born:now,explodeAt:now+1500};
 state.grenades??=[];state.grenades.push(g);return g;
}
export function flashExposure(p,g){
 const delta=[g.x-p.x,g.y-eyeHeight(p),g.z-p.z],d=Math.hypot(...delta);if(d>26)return 0;
 const direction=delta.map(v=>v/Math.max(.001,d));if(d>.1&&wallDistance([p.x,eyeHeight(p),p.z],direction,d)<d-.12)return 0;
 const f=[-Math.sin(p.yaw)*Math.cos(p.pitch||0),Math.sin(p.pitch||0),-Math.cos(p.yaw)*Math.cos(p.pitch||0)],dot=f.reduce((sum,v,i)=>sum+v*direction[i],0);
 return Math.max(0,1-d/26)*(.22+.78*Math.max(0,dot));
}
export function updateFlashes(state,dt,now,emit=()=>{},hurt=()=>{}){
 if(!flashEnabled(state))return;
 for(let n=(state.grenades||[]).length-1;n>=0;n--){const g=state.grenades[n];
  if(now>=g.explodeAt&&(g.kind==='he'||g.kind==='fire')){detonate(state,g,now,hurt,emit);state.grenades.splice(n,1);continue;}
  if(now>=g.explodeAt&&g.kind==='smoke'){bloom(state,g,now);emit({kind:'smoke',point:[g.x,g.y,g.z],time:now});state.grenades.splice(n,1);continue;}
  if(now>=g.explodeAt){
   for(const p of Object.values(state.players)){if(p.hp<=0||p.loading)continue;const strength=flashExposure(p,g);if(strength<.025)continue;const until=now+350+strength*2450;if(until>(p.blindUntil||0)){p.blindAt=now;p.blindUntil=until;p.blindStrength=strength;}}
   emit({kind:'flash',point:[g.x,g.y,g.z],time:now});state.grenades.splice(n,1);continue;
  }
  g.vy-=12*dt;
  for(const axis of ['x','y','z']){
   const velocity='v'+axis,delta=g[velocity]*dt,dir=[0,0,0];dir[['x','y','z'].indexOf(axis)]=Math.sign(delta);
   const floor=groundHeight(g.x,g.z)+.09;if(axis==='y'&&g.y+delta<floor){g.y=floor;g.vy=Math.abs(g.vy)*.35;g.vx*=.72;g.vz*=.72;if(Math.abs(g.vy)<.5)g.vy=0;continue;}
   const hit=wallDistance([g.x,g.y,g.z],dir,Math.abs(delta)+.07);
   if(hit<Math.abs(delta)+.065){g[velocity]*=-.48;}else g[axis]+=delta;
  }
 }
}
export function flashOpacity(p,now){const duration=(p.blindUntil||0)-(p.blindAt||0),left=(p.blindUntil||0)-now;if(left<=0||duration<=0)return 0;return Math.min(.98,(p.blindStrength||0)*1.35)*Math.min(1,left/Math.max(350,duration*.72));}
// Round plans for bots, kept outside the networked state. Attackers commit to one
// site per round and split over its approaches (map data), walking each route's
// waypoints in order; defenders spread over the site's hold positions.
const plans=new WeakMap();
function roundPlan(state){
 let plan=plans.get(state);const sites=sitesOf(state);
 if(!plan||plan.round!==state.round){plan={round:state.round,site:sites[(state.round*7+3)%sites.length],steps:new Map()};plans.set(state,plan);}
 return plan;
}
function routeGoal(plan,p,number){
 const routes=plan.site.routes;if(!routes)return null;const names=Object.keys(routes),route=routes[names[(number+plan.round)%names.length]],key=p.id+':'+(p.life||0);
 let step=plan.steps.get(key)??0;while(step<route.length&&distance(p,{x:route[step][0],z:route[step][1]})<2.6)step++;plan.steps.set(key,step);
 return step<route.length?{x:route[step][0],z:route[step][1]}:null;
}
// Attackers smoke one of the defenders' hold spots on the way in, once per life,
// when the planned site is 9–26 m away. Returns the landing point or null.
const smoked=new Set();
export function botSmokeTarget(state,p,now,kind='smoke'){
 const field=kind==='fire'?'fires':'smokes';
 if(!objectiveEnabled(state)||state.phase!=='live'||!flashEnabled(state)||!(p[field]>0)||p.team!==state.attackTeam)return null;
 const o=state.objective;if(!o||o.status==='planted')return null;const key=kind+':'+p.id+':'+(p.life||0)+':'+state.round;if(smoked.has(key))return null;
 const plan=roundPlan(state),site=plan.site,d=distance(p,site);if(d<9||d>26||!site.holds?.length)return null;
 if(smoked.size>200)smoked.clear();smoked.add(key);
 // Smokes cover the hold the bot would be seen from; the incendiary goes one hold further round.
 const number=[...p.id].reduce((sum,c)=>sum+c.charCodeAt(0),0),h=site.holds[(number+(kind==='fire'?1:0))%site.holds.length];return {x:h[0],z:h[1]};
}
// Defenders with a planted bomb nearby, or anyone with a fresh last-known enemy spot
// 8–24 m away out of sight, lob the HE there, once per life.
export function botHeTarget(state,p,now,known){
 if(!flashEnabled(state)||state.phase!=='live'||!(p.hes>0))return null;const key='he:'+p.id+':'+(p.life||0)+':'+state.round;if(smoked.has(key))return null;
 const o=state.objective,target=o?.status==='planted'&&p.team!==state.attackTeam?o:known&&now-known.time<2500?known:null;if(!target)return null;
 const d=distance(p,target);if(d<8||d>24)return null;smoked.add(key);return {x:target.x,z:target.z};
}
export function botObjectiveOrder(state,p){
 if(!objectiveEnabled(state)||state.phase!=='live')return null;const o=state.objective;if(!o)return null;
 const number=[...p.id].reduce((sum,c)=>sum+c.charCodeAt(0),0),sites=sitesOf(state);
 if(p.team===state.attackTeam){
  if(o.status==='dropped')return {goal:{x:o.x,z:o.z},interact:false};
  const plan=roundPlan(state),site=plan.site;
  if(o.status==='carried'&&o.carrierId===p.id){const at=distance(p,site)<site.radius-.7;return at?{goal:null,interact:true}:{goal:routeGoal(plan,p,number)||site,interact:false};}
  if(o.status==='carried'){const via=routeGoal(plan,p,number+1);return {goal:via||{x:site.x+(number%2?3:-3),z:site.z+(number%3-1)*2.5},interact:false};}
  if(o.status==='planted')return {goal:distance(p,o)<7?null:{x:o.x+(number%2?4:-4),z:o.z-3},interact:false};
 }else{
  if(o.status==='planted')return {goal:distance(p,o)<1.8?null:{x:o.x,z:o.z},interact:distance(p,o)<1.8};
  // Each defender holds its angle and checks the site's other entrances in turn.
  const site=sites[number%sites.length],h=site.holds?.[(number>>1)%site.holds.length],hold=h?{x:h[0],z:h[1]}:site;
  const watch=h?[[h[2],h[3]],[h[2],h[3]],...(site.watch||[])]:[],look=watch[Math.floor(((state.now||0)+number*733)/2400)%Math.max(1,watch.length)];
  return {goal:distance(p,hold)<(h?1.2:3)?null:hold,face:look?{x:look[0],z:look[1]}:null,interact:false};
 }
 return null;
}
