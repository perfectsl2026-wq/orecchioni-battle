// Round economy: credits from rounds and eliminations,
// spent in a buy zone during a buy window on one primary, armour, a defuse kit and
// up to four grenades. Survivors keep what they hold; the fallen lose primary,
// armour and utility. Always on in the 5v5 Squadra mode, optional in Binomio,
// never in deathmatch. Structure and amounts follow the conventions of the genre.
import {MAPS} from './shared.js?v=42.0';
import {gunOf,weaponFor,botLoadout} from './weapon-stats.js?v=42.0';
export const ECONOMY={start:800,max:9000,buyMs:12000,liveBuyMs:20000,zone:14,win:3250,objectiveWin:3500,loss:[1400,1900,2400,2900,3400],plantedLoss:800,plant:300,grenadeSlots:4,
 kill:[300,600,300,300,100,1500,300,300]};
// side: 'attack' | 'defense' limits an item to that side of the round.
export const CATEGORIES=[
 {id:'pistols',label:'PISTOLE',items:[{id:'smeriglio',weapon:0,price:0,kind:'weapon',issued:true}]},
 {id:'smg',label:'MITRA',items:[{id:'assillo',weapon:1,price:1500,kind:'weapon'}]},
 {id:'rifles',label:'FUCILI',items:[{id:'roncola',weapon:2,price:2700,kind:'weapon',side:'attack'},{id:'tarlo',weapon:3,price:2900,kind:'weapon',side:'defense'},{id:'averla',weapon:4,price:4200,kind:'weapon'}]},
 {id:'gear',label:'EQUIPAGGIAMENTO',items:[{id:'vest',price:650,kind:'armor',label:'GIUBBOTTO',detail:'100 armatura'},{id:'helmet',price:1000,kind:'armor',label:'GIUBBOTTO + ELMETTO',detail:'protegge anche la testa'},{id:'kit',price:400,kind:'gear',label:'KIT DI DISINNESCO',detail:'disinnesco in 2,5 s',side:'defense'}]},
 {id:'grenades',label:'GRANATE',items:[{id:'flash',price:200,kind:'utility',label:'FLASHBANG',detail:'massimo 2',max:2,field:'flashes'},{id:'smoke',price:300,kind:'utility',label:'FUMOGENO',detail:'15 s · massimo 1',max:1,field:'smokes'},{id:'he',price:300,kind:'utility',label:'GRANATA HE',detail:'esplosiva · massimo 1',max:1,field:'hes'},{id:'fire',price:400,kind:'utility',label:'INCENDIARIA',detail:'7 s di fuoco · massimo 1',max:1,field:'fires'}]}
];
// V42 b5: the designs of each class (weapon-variants.js) are on sale beside it, at a price that follows their role; the
// stock prices stay as they were. A design that only changes the look costs what its class costs. The id is the design's
// model id, so a purchase also says which design the slot fires (p.arms, below). They inherit the class's side.
export const DESIGN_PRICES={zanzara:500,cinghiale:700,tafano:1500,cicala:1250,maglio:2700,scure:2600,classico:4200,gheppio:3700};
const DESIGN_SLOTS={zanzara:0,cinghiale:0,tafano:1,cicala:1,maglio:2,scure:3,classico:4,gheppio:4};
const BASES=CATEGORIES.flatMap(c=>c.items.filter(i=>i.kind==='weapon').map(i=>[i,c.id]));
export const SHOP=CATEGORIES.flatMap(c=>c.items.map(i=>({...i,category:c.id}))).concat(Object.entries(DESIGN_PRICES).map(([model,price])=>{const [base,category]=BASES.find(([i])=>i.weapon===DESIGN_SLOTS[model]);return {id:model,weapon:base.weapon,model,price,kind:'weapon',...(base.side?{side:base.side}:{}),category};}));
export const itemById=id=>SHOP.find(i=>i.id===id);
// Every item of a weapon slot, the stock one first, and the item for a design of that slot (the stock item for 'stock' or an unknown id).
export const slotItems=slot=>SHOP.filter(i=>i.kind==='weapon'&&i.weapon===slot);
export const slotItem=(slot,model)=>(model&&model!=='stock'&&SHOP.find(i=>i.weapon===slot&&i.model===model))||SHOP.find(i=>i.kind==='weapon'&&i.weapon===slot&&!i.model)||null;
const modelOf=item=>item?.model||'stock';
export const economyOn=state=>!!state?.economy&&state.mode==='demolition'&&!state.preview;
// V41 CORSA ALLE ARMI: everyone climbs the same ladder, two kills a step, one knife kill to win.
// Being knifed costs a step, so the knife is always at hand. Only the weapon changes: hits and damage are the usual ones.
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
export const ownsWeapon=(state,p,index)=>state?.mode==='corsa'?index===corsaWeapon(p)||index===5:!economyOn(state)||index===0||index===5||p?.primary===index;
export const sideOf=(state,p)=>p?.team===state.attackTeam?'attack':'defense';
// V42 b5: with the economy on, a slot fires the design that was paid for, whatever the loadout says: p.arms[slot] is that
// design ('stock' or a model id). null: the loadout's own (no economy, the knife, a primary slot not held, and the sidearm
// nobody paid for: the loadout's pistol is issued free, as before b5, whichever design it is). The host writes it into
// p.finishes (pinArms), so the arbiter and the bots read it as before; each client predicts its own shots with armedFinish
// over the same synced p.arms and p.primary.
export function armsModel(state,p,slot){if(!p||!economyOn(state)||!(slot>=0&&slot<=4))return null;if(slot===0)return p.arms?.[0]??null;return p.primary===slot?p.arms?.[slot]||'stock':null;}
// The pistol a player holds now and the one the loadout issues free (p.sidearm, written by the host and synced).
export const sidearmOf=p=>p?.sidearm||'stock';
export const pistolOf=p=>p?.arms?.[0]??sidearmOf(p);
const pinned=new WeakMap(),bare={};
export function armedFinish(state,p,slot,finish){const m=armsModel(state,p,slot);if(m===null||(finish?.model||'stock')===m)return finish;const key=finish&&typeof finish==='object'?finish:bare;let byModel=pinned.get(key);if(!byModel)pinned.set(key,byModel={});return byModel[m]??={...key,model:m,build:null};}
// Host: brings p.finishes in line with p.arms; a magazine never holds more than the design now in the slot. True on a change.
// The loadout's own finish of a pinned slot is kept aside (`kept`) and put back when the slot is the loadout's again (a
// paid pistol sold or lost); a finish that is not the one pinned here is a new loadout (a packet, ARMI, the Officina).
const kept=new WeakMap();
export function pinArms(state,p){
 if(!p||!economyOn(state)||!Array.isArray(p.finishes))return false;let changed=false,k=kept.get(p);if(!k)kept.set(p,k={own:[],pin:[]});
 for(let s=0;s<=4;s++){const cur=p.finishes[s];if(!k.pin[s]||cur!==k.pin[s]){k.own[s]=cur;k.pin[s]=null;}
  const m=armsModel(state,p,s),own=k.own[s],next=m===null||(own?.model||'stock')===m?own:k.pin[s]&&(k.pin[s].model||'stock')===m?k.pin[s]:{...own,model:m,build:null};
  k.pin[s]=next===own?null:next;if(next===cur)continue;p.finishes[s]=next;changed=true;if(Array.isArray(p.ammo)&&Number.isFinite(p.ammo[s]))p.ammo[s]=Math.min(p.ammo[s],gunOf(p,s).mag);}
 const side=k.own[0]?.model||'stock';if(p.sidearm!==side){p.sidearm=side;changed=true;}
 return changed;
}
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
// V42 b2: in a taken-over body (takeover-rules.js) what is earned is the player's own and what is spent comes from the bot's wallet;
// purse is the player's own balance, shown once the body has fallen.
export function give(p,amount){p.money=clampMoney((p.money??ECONOMY.start)+amount);const t=p.takeover;if(t){t.earned=(t.earned||0)+amount;p.purse=clampMoney((t.own.money??ECONOMY.start)+t.earned);}}
export const grenadeCount=p=>(p.flashes||0)+(p.smokes||0)+(p.hes||0)+(p.fires||0);
// Why a purchase is refused, or null when it is allowed.
export function buyIssue(state,p,item,now=state.now){
 if(!item)return 'closed';if(!p||p.hp<=0||p.loading)return 'dead';
 if(!buyWindowOpen(state,now))return 'closed';if(state.phase==='live'&&!inBuyZone(state,p))return 'zone';
 if(item.side&&item.side!==sideOf(state,p))return 'side';
 if(item.kind==='weapon'&&(item.weapon===0?pistolOf(p)===modelOf(item):p.primary===item.weapon&&(p.arms?.[item.weapon]||'stock')===modelOf(item)))return 'owned';
 if(item.id==='vest'&&(p.armor||0)>=100)return 'owned';
 if(item.id==='helmet'&&(p.armor||0)>=100&&p.helmet)return 'owned';
 if(item.id==='kit'&&p.kit)return 'owned';
 if(item.kind==='utility'){if((p[item.field]||0)>=item.max)return 'full';if(grenadeCount(p)>=ECONOMY.grenadeSlots)return 'slots';}
 return (p.money??0)<priceFor(p,item)?'money':null;
}
// Topping up a vest to vest + helmet only charges the helmet.
// V42 b5: the loadout's pistol is issued free whatever its design (SMERIGLIO or not), and so is the SMERIGLIO.
export function priceFor(p,item){return item.id==='helmet'&&(p.armor||0)>=100&&!p.helmet?350:item.kind==='weapon'&&item.weapon===0&&(item.issued||modelOf(item)===sidearmOf(p))?0:item.price;}
export function buy(state,p,id,now=state.now){
 const item=itemById(id);if(buyIssue(state,p,item,now))return false;
 const price=priceFor(p,item);p.money=clampMoney(p.money-price);if(p.takeover)p.takeover.spent=(p.takeover.spent||0)+price;
 if(item.kind==='weapon'){
  // Swapping primaries drops the old one at your feet; the new one is loaded.
  // V42 b5: another design of the same class is a swap too; a pistol bought replaces the one in hand, and no pistol is ever dropped.
  const slot=item.weapon,arms=p.arms??={},old=arms[slot]||'stock';
  // The drop names its owner (its paint) and its design, even the stock one, so it is drawn as what it is (game.js dropFinish).
  const was=slot===0?pistolOf(p):old;
  if(slot>0&&Number.isInteger(p.primary)&&(p.primary!==slot||old!==modelOf(item)))(state.drops??=[]).push({id:++state.utilitySerial,weapon:p.primary,ammo:p.ammo[p.primary],x:p.x,z:p.z,y:p.y||0,born:now,yaw:p.yaw||0,by:p.id,model:arms[p.primary]||'stock'});
  if(p.weapon!==slot||was!==modelOf(item)){p.reload=0;p.reloadStart=0;}if(slot>0){if(Number.isInteger(p.primary)&&p.primary!==slot)delete arms[p.primary];p.primary=slot;}
  // The loadout's own pistol asked for again is the free one: the slot goes back to the loadout.
  if(slot===0&&modelOf(item)===sidearmOf(p))delete arms[0];else arms[slot]=modelOf(item);pinArms(state,p);p.ammo[slot]=gunOf(p,slot).mag;p.weapon=slot;}
 else if(item.id==='vest')p.armor=100;
 else if(item.id==='helmet'){p.armor=100;p.helmet=true;}
 else if(item.id==='kit')p.kit=true;
 else p[item.field]=(p[item.field]||0)+1;
 // A free weapon (the issued pistol) is not a purchase: nothing to refund.
 if(price>0||item.kind!=='weapon'){(p.bought??={})[id]=(p.bought[id]||0)+1;(p.spent??={})[id]=price;}
 return true;
}
// Refund within the buy window: weapons, kit and grenades bought this
// round and still owned go back at the price paid; armour is not refunded.
export function sellIssue(state,p,item,now=state.now){
 if(!item||!p)return 'closed';if(!buyWindowOpen(state,now)||p.hp<=0)return 'closed';if(!(p.bought?.[item.id]>0))return 'notbought';
 // A taken-over body carries the bot's purchases: they are the bot's, never refunded to the player (drove is the guest's view of it).
 if(p.takeover||p.drove===state.round)return 'takeover';
 if(item.kind==='armor')return 'armor';
 if(item.kind==='weapon'&&(item.weapon===0?pistolOf(p)!==modelOf(item):p.primary!==item.weapon||(p.arms?.[item.weapon]||'stock')!==modelOf(item)))return 'notowned';
 if(item.id==='kit'&&!p.kit)return 'notowned';
 if(item.kind==='utility'&&!(p[item.field]>0))return 'notowned';
 return null;
}
export function sell(state,p,id,now=state.now){
 const item=itemById(id);if(sellIssue(state,p,item,now))return false;
 give(p,p.spent?.[id]??item.price);p.bought[id]--;
 if(item.kind==='weapon'&&item.weapon===0){if(p.arms)delete p.arms[0];pinArms(state,p);p.ammo[0]=gunOf(p,0).mag;if(p.weapon===0){p.reload=0;p.reloadStart=0;}}
 else if(item.kind==='weapon'){p.primary=null;if(p.arms)delete p.arms[item.weapon];if(p.weapon===item.weapon){p.weapon=0;p.reload=0;p.reloadStart=0;}}
 else if(item.id==='kit')p.kit=false;
 else p[item.field]--;
 return true;
}
export function startEconomy(p){p.money=ECONOMY.start;p.primary=null;p.arms={};p.carry=null;p.flashes=0;p.smokes=0;p.hes=0;p.fires=0;p.kit=false;p.bought={};p.spent={};}
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
  if(!alive){p.primary=null;p.arms={};}p.bought={};p.spent={};
 }
}
// After resetCombat on spawn: restore what was carried, or start bare.
export function applyCarry(state,p){
 if(!economyOn(state))return;
 p.money??=ECONOMY.start;const c=p.carry;p.armor=c?.armor||0;p.helmet=!!c?.helmet;p.flashes=c?.flashes||0;p.smokes=c?.smokes||0;p.hes=c?.hes||0;p.fires=c?.fires||0;p.kit=!!c?.kit;p.carry=null;p.bought??={};p.spent??={};
 p.weapon=Number.isInteger(p.primary)?p.primary:0;
 // A fresh body: every gun full, the paid designs in their slots.
 p.arms??={};pinArms(state,p);if(Array.isArray(p.ammo))for(let s=0;s<5;s++)p.ammo[s]=gunOf(p,s).mag;
}
// Bots buy like a disciplined team: full buy when they can afford rifle and armour,
// a light buy (submachine gun and vest) when they cannot, armour only on the pistol round.
// Defenders add the kit; grenades come last, in order of value.
export function botBuy(state,p,preference){
 if(!economyOn(state)||!p.bot)return;
 // V42 b5: each bot buys the designs of its own fixed mix (weapon-stats.js botLoadout), at their prices.
 const side=sideOf(state,p),own=botLoadout(Number(String(p.id).replace(/\D/g,''))||0),design=slot=>slotItem(slot,own[slot]?.model),want=[1,2,3,4].includes(preference)?preference:side==='attack'?2:3,pick=design(want),rifle=pick&&(!pick.side||pick.side===side)?pick:design(side==='attack'?2:3),smg=design(1),money=()=>p.money||0;
 if(!Number.isInteger(p.primary)){
  if(money()>=rifle.price+650)buy(state,p,rifle.id);
  else if(money()>=smg.price+650&&(state.round||1)>1)buy(state,p,smg.id);
 }
 if((p.armor||0)<100||!p.helmet)buy(state,p,money()>=1000+(Number.isInteger(p.primary)?0:rifle.price)?'helmet':'vest');
 if(Number.isInteger(p.primary)){
  if(side==='defense'&&money()>=400)buy(state,p,'kit');
  if(money()>=300)buy(state,p,'smoke');if(money()>=200)buy(state,p,'flash');if(money()>=300)buy(state,p,'he');if(money()>=1200)buy(state,p,'fire');
 }
}
