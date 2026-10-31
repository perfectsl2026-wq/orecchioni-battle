import {smokeBlocks} from './smoke-rules.js?v=38.3';
import {FIRE} from './blast-rules.js?v=38.3';
import {GUN_RULES} from './combat-rules.js?v=38.3';
import {eyeHeight,STANCE} from './player-feel.js?v=38.3';
import {turnToward,BOT_RUN_SPEED} from './agent-motion.js?v=38.3';
import {blocked,wallDistance,raySphere,WEAPONS,WALLS,ACTIVE_MAP} from './shared.js?v=38.3';
import {BotNavigator,planRoute,routeLength,walkClear,NAV_AREAS} from './bot-navigation.js?v=38.3';
export {planRoute,walkClear};
export const BOT_LEVELS={
 recruit:{label:'RECLUTA',reaction:[750,1100],turn:2.8,error:.025,burst:[2,3],pause:[650,1000]},
 tactical:{label:'REGOLARE',reaction:[350,600],turn:4.2,error:.013,burst:[3,5],pause:[350,650]},
 veteran:{label:'VETERANO',reaction:[230,380],turn:4.8,error:.008,burst:[4,6],pause:[220,450]}
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const memory=new Map(),reports=new Map(),orders=new Map(),visits={blue:new Map(),orange:new Map()};
function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function random(m){m.seed=(Math.imul(m.seed,1664525)+1013904223)>>>0;return m.seed/4294967296;}
const range=(m,pair)=>pair[0]+random(m)*(pair[1]-pair[0]);
// Walls and active smoke clouds both block sight.
function clearRay(a,b,height){const o=[a.x,eyeHeight(a),a.z],v=[b.x-a.x,height+(b.y||0)-(b.duck||0)*STANCE.drop-o[1],b.z-a.z],d=Math.hypot(...v);return d<.01||wallDistance(o,v.map(x=>x/d),d)>=d-.05&&!smokeBlocks(o,[o[0]+v[0],o[1]+v[1],o[2]+v[2]]);}
export function hasSight(a,b){return clearRay(a,b,1.08)||clearRay(a,b,1.65);}
export function resetBots(){memory.clear();reports.clear();orders.clear();visits.blue.clear();visits.orange.clear();}
export function resetBot(p){memory.delete(p.id);orders.delete(p.id);}
export function hearBotShot(shooter,players,now){
 for(const bot of players){
  if(!bot.bot||bot.hp<=0||bot.team===shooter.team)continue;const m=memory.get(bot.id);if(!m)continue;
  const d=distance(bot,shooter);if(d<(hasSight(bot,shooter)?42:38)){
   // A shot is audible across this small arena. Do not let the target already
   // being fought continuously overwrite a distinct, recent contact.
   if(m.heard&&shooter.id===m.target&&m.heard.source!==shooter.id&&now-m.heard.time<3500)continue;
   const error=1+d*.045;m.heard={x:shooter.x+(random(m)-.5)*error,z:shooter.z+(random(m)-.5)*error,time:now,source:shooter.id};
  }
 }
}
function createMemory(p,players,now){
 const allies=players.filter(a=>a.bot&&a.team===p.team).sort((a,b)=>a.id.localeCompare(b.id));
 return {seed:hash(p.id+':'+(p.life||0)),role:Math.max(0,allies.findIndex(a=>a.id===p.id)),life:p.life||0,
  primary:p.id.endsWith('0')?2:p.id.endsWith('2')?1:3,nav:new BotNavigator(p.id),born:now,
  target:null,lastSeen:0,lastKnown:null,heard:null,senseAt:0,reactAt:now+600,visible:false,
  burst:0,burstUntil:0,nextBurst:0,lastAmmo:0,lastWeapon:-1,turnRate:0,lastHP:p.hp,lastHit:-Infinity,
  action:'advance',actionUntil:0,combatGoal:null,cover:null,retreatUntil:0,patrolGoal:null,patrolAt:0,
  searchPoint:null,scanUntil:0,scanYaw:p.yaw,ignoreReportBefore:0,mode:'patrol'};
}
function sense(p,players,m,now,level){
 if(now<(p.blindUntil||0)){m.visible=false;m.senseAt=now+100;return null;}
 let best=null,score=Infinity;
 for(const e of players){
  if(e.id===p.id||e.team===p.team||e.hp<=0)continue;
  const d=distance(p,e),angle=Math.abs(wrap(Math.atan2(p.x-e.x,p.z-e.z)-p.yaw));
  if(d>(ACTIVE_MAP==='sahra'?76:31)||(d>3&&angle>Math.PI*.4)||!hasSight(p,e))continue;
  const priority=d+(e.id===m.target?-3:0);if(priority<score){score=priority;best=e;}
 }
 if(best){
  if(m.target!==best.id||now-m.lastSeen>1200){m.reactAt=now+range(m,level.reaction);m.burst=0;m.nextBurst=m.reactAt;m.actionUntil=0;m.combatGoal=null;}
  m.target=best.id;m.lastSeen=now;m.lastKnown={x:best.x,z:best.z,y:best.y||0,duck:best.duck||0,time:now};
  reports.set(p.team,{...m.lastKnown,target:best.id});
 }
 // Running footsteps carry about 15 m, as in classic tacticals; walking is silent.
 if(!best)for(const e of players){
  if(e.team===p.team||e.hp<=0||(e.speed||0)<2.6)continue;const d=distance(p,e);
  if(d<15&&(!m.heard||now-m.heard.time>900)){const error=.8+d*.06;m.heard={x:e.x+(random(m)-.5)*error,z:e.z+(random(m)-.5)*error,time:now,source:e.id,steps:true};break;}
 }
 m.visible=!!best;m.senseAt=now+85+random(m)*40;return best;
}
function friendlyLine(p,target,players,height){
 const o=[p.x,eyeHeight(p),p.z],d=[target.x-p.x,height+(target.y||0)-(target.duck||0)*STANCE.drop-o[1],target.z-p.z],len=Math.hypot(...d),dir=d.map(x=>x/Math.max(.001,len));
 return players.some(a=>a.id!==p.id&&a.team===p.team&&a.hp>0&&raySphere(o,dir,[a.x,1.1+(a.y||0)-(a.duck||0)*STANCE.drop,a.z],.58)<len-.5);
}
export function findCover(p,enemy,players=[]){
 let best=null,bestCost=Infinity;
 for(const w of WALLS){
  if(w[5]===7||w[2]>9||w[3]>12||w[4]<1.5||distance(p,{x:w[0],z:w[1]})>8)continue;
  const dx=enemy.x-w[0],dz=enemy.z-w[1],alongX=Math.abs(dx)>Math.abs(dz),sign=(alongX?dx:dz)>0?-1:1;
  const hide=alongX?{x:w[0]+sign*(w[2]/2+.9),z:w[1]}:{x:w[0],z:w[1]+sign*(w[3]/2+.9)};
  if(blocked(hide.x,hide.z,.45)||hasSight(enemy,hide)||distance(p,hide)>6)continue;
  for(const side of [-1,1]){
   const peek=alongX?{x:hide.x,z:w[1]+side*(w[3]/2+1)}:{x:w[0]+side*(w[2]/2+1),z:hide.z};
   if(blocked(peek.x,peek.z,.45)||!walkClear(hide,peek,.43)||!hasSight(peek,enemy))continue;
   const path=planRoute(p,hide),length=routeLength(path);if(!path.length||length>8.5)continue;
   const occupied=players.some(a=>a.id!==p.id&&a.team===p.team&&a.hp>0&&distance(a,hide)<1.3);
   const cost=length+(occupied?8:0)+distance(p,peek)*.1;
   if(cost<bestCost){bestCost=cost;best={hide,peek};}
  }
 }
 return best;
}
function sidestep(p,contact,m,players,retreat=false){
 const d=Math.max(.1,distance(p,contact)),dx=(contact.x-p.x)/d,dz=(contact.z-p.z)/d,side=m.role%2===0?1:-1;
 const options=retreat?[[p.x-dx*2.2,p.z-dz*2.2],[p.x+dz*side*2,p.z-dx*side*2],[p.x-dz*side*2,p.z+dx*side*2]]:
  [[p.x+dz*side*2,p.z-dx*side*2],[p.x-dz*side*2,p.z+dx*side*2],[p.x+dx*1.6,p.z+dz*1.6]];
 for(const[x,z]of options){const q={x,z};if(!walkClear(p,q,.4)||players.some(a=>a.id!==p.id&&a.team===p.team&&a.hp>0&&distance(a,q)<1))continue;return q;}
 return null;
}
function choosePatrol(p,players,m,now){
 let best=null,score=-Infinity;
 for(let i=0;i<NAV_AREAS.length;i++){
  const q=NAV_AREAS[i],d=distance(p,q);if(d<2.5)continue;
  const age=Math.min(45,(now-(visits[p.team].get(i)??m.born-25000))/1000);
  const initial=now-m.born<1200?(p.team==='blue'?q.z:-q.z)*.45:0;
  const lane=q.x*(m.role%2===0?1:-1)*.08;
  let reserved=0;for(const[id,o]of orders)if(id!==p.id&&o.team===p.team&&now-o.time<10000&&distance(o.goal,q)<4)reserved+=12;
  const rank=age-d*.42+initial+lane-reserved;
  if(rank>score){score=rank;best={...q,index:i};}
 }
 m.patrolGoal=best;m.patrolAt=now;m.nav.goal=null;
 if(best)orders.set(p.id,{team:p.team,goal:best,time:now});
 return best;
}
function patrol(p,players,m,now){
 if(!m.patrolGoal||distance(p,m.patrolGoal)<.8||m.nav.failed||now-m.patrolAt>22000){
  if(m.patrolGoal)visits[p.team].set(m.patrolGoal.index,now);
  choosePatrol(p,players,m,now);
 }
 return m.patrolGoal;
}
export function botInput(p,players,now,dt,context={}){
 dt=Math.max(.001,Math.min(.05,dt));
 if(!Number.isFinite(p.yaw))p.yaw=p.team==='blue'?Math.PI:0;if(!Number.isFinite(p.pitch))p.pitch=0;
 const level=BOT_LEVELS[context.difficulty]||BOT_LEVELS.tactical;
 let m=memory.get(p.id);if(!m||m.life!==(p.life||0)){m=createMemory(p,players,now);if(Number.isInteger(context.weapon)&&WEAPONS[context.weapon])m.primary=context.weapon;memory.set(p.id,m);p.weapon=m.primary;}
 if(now>=(m.visitAt||0)){for(let i=0;i<NAV_AREAS.length;i++)if(distance(p,NAV_AREAS[i])<2.2)visits[p.team].set(i,now);m.visitAt=now+250;}
 let enemy;
 if(now>=m.senseAt)enemy=sense(p,players,m,now,level);
 else if(m.visible&&now>=(p.blindUntil||0)){const e=players.find(a=>a.id===m.target&&a.team!==p.team&&a.hp>0);if(e&&hasSight(p,e))enemy=e;}
 if(enemy){m.lastSeen=now;m.lastKnown={x:enemy.x,z:enemy.z,y:enemy.y||0,duck:enemy.duck||0,time:now};m.searchPoint=null;}
 if(p.hp<m.lastHP){m.lastHit=now;m.retreatUntil=now+1200;}m.lastHP=p.hp;
 if(m.lastWeapon===p.weapon&&p.ammo[p.weapon]<m.lastAmmo){
  m.burst=Math.max(0,m.burst-(m.lastAmmo-p.ammo[p.weapon]));
  if(m.burst===0){m.nextBurst=now+range(m,level.pause);m.action='move';m.actionUntil=0;}
 }
 m.lastAmmo=p.ammo[p.weapon];m.lastWeapon=p.weapon;
 if(now>m.burstUntil)m.burst=0;
 const previousMode=m.mode;
 let goal=null,fire=false,reload=false,maxSpeed=Math.min(BOT_RUN_SPEED,GUN_RULES[p.weapon].speed),look=null,aim=false;
 const weapon=WEAPONS[p.weapon],empty=p.ammo[p.weapon]===0;
 const report=reports.get(p.team),freshNoise=m.heard&&now-m.heard.time<5500&&m.heard.time>(m.lastKnown?.time||0)+350;
 const known=freshNoise?m.heard:m.lastKnown&&now-m.lastKnown.time<6500?m.lastKnown:
  report&&report.time>m.ignoreReportBefore&&now-report.time<5000?report:m.heard&&now-m.heard.time<5500?m.heard:null;
 const contact=enemy||((empty||p.reload||p.hp<35&&now<m.retreatUntil)&&known?known:null);
 if(contact){
  const d=distance(p,contact),height=clearRay(p,contact,1.08)?1.08:1.65;
  const lane=!friendlyLine(p,contact,players,height),injured=p.hp<35&&now<m.retreatUntil;
  const desired=Math.atan2(p.x-contact.x,p.z-contact.z)+Math.sin(now*.002+hash(p.id)*.001)*level.error;
  turnToward(p,m,desired,level.turn,dt);look=contact;aim=true;
  const targetPitch=Math.atan2(height+(contact.y||0)-(contact.duck||0)*STANCE.drop-eyeHeight(p),Math.max(.1,d))+Math.cos(now*.0025+hash(p.id)*.002)*level.error*.6;
  p.pitch+=(targetPitch-p.pitch)*(1-Math.exp(-12*dt));
  const aligned=Math.abs(wrap(desired-p.yaw))<.045;
  if(empty||p.reload||injured){
   m.burst=0;m.mode=empty||p.reload?'reload':'cover';
   if(!m.cover||now>m.actionUntil||m.nav.failed){m.cover=findCover(p,contact,players);m.combatGoal=m.cover?.hide||sidestep(p,contact,m,players,true);m.actionUntil=now+1800;}
   goal=m.combatGoal;maxSpeed=3.7;reload=empty||p.ammo[p.weapon]<weapon.mag*.5;
  }else{
   m.cover=null;
   if(!lane){
    // A teammate in the firing lane cancels the stance immediately.
    m.burst=0;m.mode='reposition';
    if(now>m.actionUntil||!m.combatGoal||m.nav.failed){m.combatGoal=sidestep(p,contact,m,players);m.actionUntil=now+850;}
    goal=m.combatGoal;maxSpeed=2.8;
   }else{
    const ready=!!enemy&&now>=m.reactAt&&now>=(contact.invulnerable||0);
    if(ready&&now>=m.nextBurst&&d<(ACTIVE_MAP==='sahra'?(p.weapon===4?72:p.weapon===1?34:p.weapon===0?30:55):(p.weapon===4?45:24))&&m.burst===0){
     m.crouch=d>8&&random(m)<.45&&clearRay({...p,duck:1},contact,height);m.burst=Math.round(range(m,level.burst));m.burstUntil=now+weapon.rate*m.burst*1000+650;m.action='shoot';
    }
    if(m.burst>0&&ready){
     m.mode='engage';goal=null;
     fire=aligned&&Math.hypot(m.nav.velocity.x,m.nav.velocity.z)<.45&&(p.speed||0)<.45;
    }else{
     m.mode=d>16?'advance':'reposition';
     if(d>16){goal=contact;maxSpeed=3.8;}
     else{
      if(now>m.actionUntil||!m.combatGoal||m.nav.failed){m.combatGoal=sidestep(p,contact,m,players,d<4);m.actionUntil=now+1000+random(m)*450;}
      goal=m.combatGoal;maxSpeed=2.5;
     }
    }
   }
  }
 }else if(context.objective&&!p.reload){
  // At a hold position the order names the angle to watch (an entrance).
  m.burst=0;m.cover=null;m.mode='objective';goal=context.objective.goal;look=goal||context.objective.face||null;
 }else{
  m.burst=0;m.cover=null;
  if(known&&known.time>m.ignoreReportBefore){
   m.mode='search';goal=known;look=known;
   if(distance(p,known)<1||m.nav.failed||m.searchPoint&&now-m.searchPoint.started>6500){
    m.ignoreReportBefore=now;m.lastKnown=null;m.heard=null;m.searchPoint=null;
    m.scanUntil=now+650;m.scanYaw=p.yaw;m.nav.goal=null;
   }else if(!m.searchPoint||distance(m.searchPoint,known)>2)m.searchPoint={...known,started:now};
  }else{
   m.mode='patrol';goal=patrol(p,players,m,now);
  }
  if(now<m.scanUntil){m.mode='check';goal=null;look=null;}
  reload=p.ammo[p.weapon]<weapon.mag*.4;
 }
 if(empty)reload=true;
 // Holding still, a bot turns to the last noise it heard or a teammate's fresh call,
 // otherwise to the angle it holds.
 if(context.objective&&!enemy&&!p.reload){m.mode='objective';goal=context.objective.goal;look=goal||(m.heard&&now-m.heard.time<2500?m.heard:report&&now-report.time<3000?report:context.objective.face)||null;maxSpeed=Math.min(BOT_RUN_SPEED,GUN_RULES[p.weapon].speed);}
 if(goal&&m.mode!==previousMode&&['search','patrol','reload','cover','objective'].includes(m.mode))m.nav.goal=null;
 // Standing in fire: step straight out of it, away from the nearest patch, before anything else.
 const burning=context.fires?.find(f=>distance(p,f)<FIRE.radius+.6);
 if(burning){const d=Math.max(.3,distance(p,burning));goal={x:p.x+(p.x-burning.x)/d*(FIRE.radius+2.5),z:p.z+(p.z-burning.z)/d*(FIRE.radius+2.5)};m.mode='escape';m.nav.goal=null;maxSpeed=4.7;}
 const velocity=m.nav.update(p,goal,players,now,dt,Math.min(maxSpeed,GUN_RULES[p.weapon].speed),!contact);
 if(!contact){
  const facing=now<m.scanUntil?m.scanYaw+Math.sin((now-(m.scanUntil-650))*.006)*.6:
   m.nav.look&&goal?Math.atan2(p.x-m.nav.look.x,p.z-m.nav.look.z):look?Math.atan2(p.x-look.x,p.z-look.z):p.yaw;
  turnToward(p,m,facing,level.turn,dt);p.pitch*=Math.exp(-8*dt);
 }
 // An enemy flash about to pop within 20 m: turn away, as players do, and hold fire.
 const pop=context.grenades?.find(g=>g.kind!=='smoke'&&g.explodeAt-now<900&&g.explodeAt>now&&distance(p,g)<20&&players.some(a=>a.id===g.owner&&a.team!==p.team));
 if(pop){turnToward(p,m,Math.atan2(p.x-pop.x,p.z-pop.z)+Math.PI,level.turn*1.5,dt);fire=false;aim=false;}
 p.vx=velocity.x;p.vz=velocity.z;
 const forward=(-Math.sin(p.yaw)*velocity.x-Math.cos(p.yaw)*velocity.z)/4.7;
 const side=(Math.cos(p.yaw)*velocity.x-Math.sin(p.yaw)*velocity.z)/4.7;
 const flash=!!context.utility&&!!enemy&&p.flashes>0&&now>=(p.flashReady||0)&&now-m.born>2000&&distance(p,enemy)>9&&distance(p,enemy)<22&&now>=(p.blindUntil||0);
 // HE at a known enemy position out of sight, only when no flash goes out this tick.
 const heTarget=!flash&&!enemy&&!burning&&context.he&&now>=(p.flashReady||0)&&now>=(p.equipUntil||0)?context.he(m.lastKnown&&now-m.lastKnown.time<2500?m.lastKnown:null):null;
 return {flash,he:!!heTarget,heTarget,interact:!!context.objective?.interact&&!enemy&&!p.reload,forward,side,crouch:m.mode==='engage'&&!!m.crouch,slow:false,fire:fire&&now>=(p.blindUntil||0),reload:reload&&!p.reload,aim};
}
export function botDebug(id){
 const m=memory.get(id);return m?{mode:m.mode,target:m.target,lastKnown:m.lastKnown&&{...m.lastKnown},role:m.role,
  cover:!!m.cover,phase:m.action,velocity:{...m.nav.velocity},...m.nav.debug()}:null;
}
