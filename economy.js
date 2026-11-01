// Round economy in the Counter-Strike mould: credits from rounds and eliminations,
// spent in a buy zone during a buy window on one primary, armour, a defuse kit and
// up to four grenades. Survivors keep what they hold; the fallen lose primary,
// armour and utility. Always on in the 5v5 competitive mode, optional in Wingman,
// never in deathmatch. Values are this game's own; the structure follows the genre.
import {WEAPONS,MAPS} from './shared.js?v=41.0';
export const ECONOMY={start:800,max:9000,buyMs:12000,liveBuyMs:20000,zone:14,win:3250,objectiveWin:3500,loss:[1400,1900,2400,2900,3400],plantedLoss:800,plant:300,grenadeSlots:4,
 kill:[300,600,300,300,100,1500,300,300]};
// side: 'attack' | 'defense' limits an item to that side of the round, as rifles in CS.
export const CATEGORIES=[
 {id:'pistols',label:'PISTOLE',items:[{id:'p226',weapon:0,price:0,kind:'weapon',issued:true}]},
 {id:'smg',label:'MITRA',items:[{id:'mp5',weapon:1,price:1500,kind:'weapon'}]},
 {id:'rifles',label:'FUCILI',items:[{id:'ak',weapon:2,price:2700,kind:'weapon',side:'attack'},{id:'m4',weapon:3,price:2900,kind:'weapon',side:'defense'},{id:'m24',weapon:4,price:4200,kind:'weapon'}]},
 {id:'gear',label:'EQUIPAGGIAMENTO',items:[{id:'vest',price:650,kind:'armor',label:'GIUBBOTTO',detail:'100 armatura'},{id:'helmet',price:1000,kind:'armor',label:'GIUBBOTTO + ELMETTO',detail:'protegge anche la testa'},{id:'kit',price:400,kind:'gear',label:'KIT DI DISINNESCO',detail:'disinnesco in 2,5 s',side:'defense'}]},
 {id:'grenades',label:'GRANATE',items:[{id:'flash',price:200,kind:'utility',label:'FLASHBANG',detail:'massimo 2',max:2,field:'flashes'},{id:'smoke',price:300,kind:'utility',label:'FUMOGENO',detail:'15 s · massimo 1',max:1,field:'smokes'},{id:'he',price:300,kind:'utility',label:'GRANATA HE',detail:'esplosiva · massimo 1',max:1,field:'hes'},{id:'fire',price:400,kind:'utility',label:'INCENDIARIA',detail:'7 s di fuoco · massimo 1',max:1,field:'fires'}]}
];
export const SHOP=CATEGORIES.flatMap(c=>c.items.map(i=>({...i,category:c.id})));
export const itemById=id=>SHOP.find(i=>i.id===id);
export const economyOn=state=>!!state?.economy&&state.mode==='demolition'&&!state.preview;
// V41 CORSA ALLE ARMI: everyone climbs the same ladder, two kills a step, one knife kill to win.
// Being knifed costs a step. Only the weapon in hand changes: hits and damage are the usual ones.
export const CORSA_LADDER=[3,2,1,4,0,5];
export const CORSA_KILLS=2;
export const corsaWeapon=p=>CORSA_LADDER[Math.min(p?.tier||0,CORSA_LADDER.length-1)];
export const corsaNeeded=p=>(p?.tier||0)>=CORSA_LADDER.length-1?1:CORSA_KILLS;
export function corsaKill(state,killer,victim,weapon){
 if(weapon===5&&(victim.tier||0)>0&&(killer.tier||0)<CORSA_LADDER.length-1){victim.tier--;victim.tierKills=0;}
 killer.tierKills=(killer.tierKills||0)+1;if(killer.tierKills<corsaNeeded(killer))return false;
 killer.tierKills=0;killer.tier=(killer.tier||0)+1;
 if(killer.tier>=CORSA_LADDER.length){killer.tier=CORSA_LADDER.length-1;state.corsaWinner={id:killer.id,name:killer.name,team:killer.team};state.score[killer.team]=Math.max(state.score.blue,state.score.orange)+1;state.ended=true;}
 return true;
}
export const ownsWeapon=(state,p,index)=>state?.mode==='corsa'?index===corsaWeapon(p):!economyOn(state)||index===0||index===5||p?.primary===index;
export const sideOf=(state,p)=>p?.team===state.attackTeam?'attack':'defense';
// Buy zone: within ECONOMY.zone metres of the side's own spawn line.
export function inBuyZone(state,p){
 if(!p)return false;const map=MAPS[state.map];if(!map)return true;
 const spawnTeam=state.attackTeam?(p.team===state.attackTeam?'orange':'blue'):p.team,spots=map.spawns?.[spawnTeam]||[];
 return spots.some(s=>Math.hypot(p.x-s[0],p.z-s[1])<=ECONOMY.zone);
}
// The buy window: the whole freeze, then ECONOMY.liveBuyMs of the live round inside the zone.
export const buyWindowOpen=(state,now)=>economyOn(state)&&!state.ended&&(state.phase==='freeze'||state.phase==='live'&&now-(state.liveAt??-Infinity)<ECONOMY.liveBuyMs);
export const buyWindowLeft=(state,now)=>state.phase==='freeze'?Math.max(0,state.phaseUntil-now):Math.max(0,(state.liveAt??now)+ECONOMY.liveBuyMs-now);
export function canBuyNow(state,p,now=state.now){return buyWindowOpen(state,now)&&(!p||state.phase==='freeze'||inBuyZone(state,p));}
const clampMoney=v=>Math.max(0,Math.min(ECONOMY.max,Math.round(v)));
export function give(p,amount){p.money=clampMoney((p.money??ECONOMY.start)+amount);}
export const grenadeCount=p=>(p.flashes||0)+(p.smokes||0)+(p.hes||0)+(p.fires||0);
// Why a purchase is refused, or null when it is allowed.
export function buyIssue(state,p,item,now=state.now){
 if(!item)return 'closed';if(!p||p.hp<=0||p.loading)return 'dead';
 if(!buyWindowOpen(state,now))return 'closed';if(state.phase==='live'&&!inBuyZone(state,p))return 'zone';
 if(item.side&&item.side!==sideOf(state,p))return 'side';
 if(item.issued)return 'owned';
 if(item.kind==='weapon'&&p.primary===item.weapon)return 'owned';
 if(item.id==='vest'&&(p.armor||0)>=100)return 'owned';
 if(item.id==='helmet'&&(p.armor||0)>=100&&p.helmet)return 'owned';
 if(item.id==='kit'&&p.kit)return 'owned';
 if(item.kind==='utility'){if((p[item.field]||0)>=item.max)return 'full';if(grenadeCount(p)>=ECONOMY.grenadeSlots)return 'slots';}
 return (p.money??0)<priceFor(p,item)?'money':null;
}
// Topping up a vest to vest + helmet only charges the helmet, as in CS.
export function priceFor(p,item){return item.id==='helmet'&&(p.armor||0)>=100&&!p.helmet?350:item.price;}
export function buy(state,p,id,now=state.now){
 const item=itemById(id);if(buyIssue(state,p,item,now))return false;
 const price=priceFor(p,item);p.money=clampMoney(p.money-price);
 if(item.kind==='weapon'){
  // Swapping primaries drops the old one at your feet; the new one is loaded.
  if(Number.isInteger(p.primary)&&p.primary!==item.weapon)(state.drops??=[]).push({id:++state.utilitySerial,weapon:p.primary,ammo:p.ammo[p.primary],x:p.x,z:p.z,y:p.y||0,born:now,yaw:p.yaw||0});
  p.primary=item.weapon;p.ammo[item.weapon]=WEAPONS[item.weapon].mag;p.weapon=item.weapon;}
 else if(item.id==='vest')p.armor=100;
 else if(item.id==='helmet'){p.armor=100;p.helmet=true;}
 else if(item.id==='kit')p.kit=true;
 else p[item.field]=(p[item.field]||0)+1;
 (p.bought??={})[id]=(p.bought[id]||0)+1;(p.spent??={})[id]=price;
 return true;
}
// Refund within the buy window, as in CS: weapons, kit and grenades bought this
// round and still owned go back at the price paid; armour is not refunded.
export function sellIssue(state,p,item,now=state.now){
 if(!item||!p)return 'closed';if(!buyWindowOpen(state,now)||p.hp<=0)return 'closed';if(!(p.bought?.[item.id]>0))return 'notbought';
 if(item.kind==='armor')return 'armor';
 if(item.kind==='weapon'&&p.primary!==item.weapon)return 'notowned';
 if(item.id==='kit'&&!p.kit)return 'notowned';
 if(item.kind==='utility'&&!(p[item.field]>0))return 'notowned';
 return null;
}
export function sell(state,p,id,now=state.now){
 const item=itemById(id);if(sellIssue(state,p,item,now))return false;
 give(p,p.spent?.[id]??item.price);p.bought[id]--;
 if(item.kind==='weapon'){p.primary=null;if(p.weapon===item.weapon)p.weapon=0;}
 else if(item.id==='kit')p.kit=false;
 else p[item.field]--;
 return true;
}
export function startEconomy(p){p.money=ECONOMY.start;p.primary=null;p.carry=null;p.flashes=0;p.smokes=0;p.hes=0;p.fires=0;p.kit=false;p.bought={};p.spent={};}
// Called once per round result: winners and losers are paid, streaks tracked.
export function payRound(state,winner,reason){
 if(!economyOn(state))return;
 const streak=state.lossStreak??={blue:0,orange:0},objective=/BOMBA/.test(reason),planted=state.objective?.plantedAt>0,pay={};
 for(const team of ['blue','orange']){
  if(team===winner){streak[team]=0;pay[team]=objective?ECONOMY.objectiveWin:ECONOMY.win;continue;}
  // The first loss pays the base bonus; each further loss in a row pays more.
  pay[team]=ECONOMY.loss[streak[team]]+(planted&&team===state.attackTeam?ECONOMY.plantedLoss:0);
  if(winner)streak[team]=Math.min(ECONOMY.loss.length-1,streak[team]+1);
 }
 for(const p of Object.values(state.players))if(pay[p.team])give(p,pay[p.team]);
 state.lastPay=pay;
}
// Before players respawn for a round: survivors keep what they hold, the fallen
// lose primary, armour and utility. At half time everything resets.
export function carryRound(state,{halfTime=false}={}){
 if(!economyOn(state))return;
 if(halfTime)state.lossStreak={blue:0,orange:0};
 for(const p of Object.values(state.players)){
  if(p.money===undefined||halfTime){startEconomy(p);continue;}
  const alive=p.hp>0&&!p.loading;
  p.carry=alive?{armor:p.armor||0,helmet:!!p.helmet,flashes:p.flashes||0,smokes:p.smokes||0,hes:p.hes||0,fires:p.fires||0,kit:!!p.kit}:null;
  if(!alive)p.primary=null;p.bought={};p.spent={};
 }
}
// After resetCombat on spawn: restore what was carried, or start bare.
export function applyCarry(state,p){
 if(!economyOn(state))return;
 p.money??=ECONOMY.start;const c=p.carry;p.armor=c?.armor||0;p.helmet=!!c?.helmet;p.flashes=c?.flashes||0;p.smokes=c?.smokes||0;p.hes=c?.hes||0;p.fires=c?.fires||0;p.kit=!!c?.kit;p.carry=null;p.bought??={};p.spent??={};
 p.weapon=Number.isInteger(p.primary)?p.primary:0;
}
// Bots buy like a disciplined team: full buy when they can afford rifle and armour,
// a light buy (MP5 and vest) when they cannot, armour only on the pistol round.
// Defenders add the kit; grenades come last, in CS order of value.
export function botBuy(state,p,preference){
 if(!economyOn(state)||!p.bot)return;
 const side=sideOf(state,p),want=[1,2,3,4].includes(preference)?preference:side==='attack'?2:3,rifle=SHOP.find(i=>i.weapon===want&&(!i.side||i.side===side))||SHOP.find(i=>i.weapon===(side==='attack'?2:3)),money=()=>p.money||0;
 if(!Number.isInteger(p.primary)){
  if(money()>=rifle.price+650)buy(state,p,rifle.id);
  else if(money()>=2150&&(state.round||1)>1)buy(state,p,'mp5');
 }
 if((p.armor||0)<100||!p.helmet)buy(state,p,money()>=1000+(Number.isInteger(p.primary)?0:rifle.price)?'helmet':'vest');
 if(Number.isInteger(p.primary)){
  if(side==='defense'&&money()>=400)buy(state,p,'kit');
  if(money()>=300)buy(state,p,'smoke');if(money()>=200)buy(state,p,'flash');if(money()>=300)buy(state,p,'he');if(money()>=1200)buy(state,p,'fire');
 }
}
