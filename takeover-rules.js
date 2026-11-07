import {ECONOMY,pinArms} from './economy.js?v=42.0';
import {gunOf} from './weapon-stats.js?v=42.0';
// V42 b2: dead in a round, a player may take over a living bot of the own team for the rest of that round, as in classic
// tactical shooters. The host decides: it checks the request, puts the player in the bot's body (place, health, armour,
// weapons, ammo, credits, grenades, look) and parks the bot, which stays out of play and out of the alive count. The
// player's own record is kept aside. At the next round, a rematch, or when the player leaves, it is all handed back: the
// bot takes the body as it stands (alive or not), the player his own record. Kills made in the body are the player's.
// Credits: the bot pays what was spent from its wallet, the player keeps what the body earned (economy.js give and buy keep
// the tally, so the 9000 cap of either wallet never eats into the other); both get the round pay. The body's death is the bot's.
const BODY=['x','z','y','groundY','yaw','pitch','duck','vx','vz','speed','jumpV','landingUntil','landedAt','hp','armor','helmet','weapon','ammo','reload','reloadStart','reloadDone','primary','weaponReady','equipUntil','shots','recoilWeapon','lastShot','aimSince','aimHeld','money','flashes','smokes','hes','fires','kit','flashReady','blindAt','blindUntil','blindStrength','taggedUntil','received','operator','bought','spent','arms','invulnerable','dead','death'];
const copy=v=>Array.isArray(v)?v.slice():v&&typeof v==='object'?{...v}:v;
// V42 b5: with the economy on, the designs the bot paid for (arms) go with the body and are what the driver fires (economy.js
// pinArms); without it, as before:
// V42 b4a: the body's guns are fired with the designs of whoever drives it (each client predicts and draws its own loadout),
// so a magazine copied across never holds more than that design's size (a 40-round CICALA into a 30-round ASSILLO).
const fitAmmo=p=>{if(Array.isArray(p.ammo))for(let i=0;i<p.ammo.length;i++)if(Number.isFinite(p.ammo[i]))p.ammo[i]=Math.min(p.ammo[i],gunOf(p,i).mag);};
const clampMoney=v=>Math.max(0,Math.min(ECONOMY.max,Math.round(v)));
// Why a request is refused, or null when the player may take the bot now.
export function takeoverIssue(state,p,bot,roundMode){
 if(!roundMode||!state||state.preview)return 'mode';if(state.ended||state.phase!=='live')return 'phase';
 if(!p||p.loading||p.away||p.hp>0||p.bot)return 'player';if(p.drove===state.round||p.takeover)return 'once';
 if(!bot||bot===p||!bot.bot||bot.team!==p.team||bot.hp<=0||bot.loading||bot.heldBy)return 'bot';
 return null;
}
// Host only, after takeoverIssue said yes. Returns the player, now in the bot's body.
export function takeOver(state,p,bot){
 const own={};for(const k of BODY)own[k]=copy(p[k]);
 p.takeover={bot:bot.id,round:state.round,own,botMoney:bot.money,paid:state.lastPay??null,earned:0,spent:0};if(Number.isFinite(own.money))p.purse=own.money;
 for(const k of BODY)p[k]=copy(bot[k]);
 pinArms(state,p);fitAmmo(p);p.dead=0;p.death=null;p.invulnerable=0;p.life=(p.life||0)+1;p.drove=state.round;p.input={};p.jumpRequestUntil=-Infinity;
 bot.heldBy=p.id;bot.hp=0;bot.dead=0;bot.death=null;bot.input={};bot.reload=0;
 const o=state.objective;if(o){if(o.carrierId===bot.id)o.carrierId=p.id;if(o.droppedBy===bot.id)o.droppedBy=null;if(o.actorId===bot.id){o.actorId=null;o.actionStarted=0;o.progress=0;}}
 return p;
}
// Hands everything back. Returns the bot when it got a body back (the caller resets its navigation), else null.
export function releaseTakeover(state,p){
 const t=p?.takeover;if(!t)return null;p.takeover=null;delete p.purse;const bot=state.players[t.bot],held=bot&&bot.heldBy===p.id,economy=Number.isFinite(t.botMoney)&&Number.isFinite(t.own.money);
 // A round result since the takeover (payRound writes a new lastPay) paid the body, counted in earned for the player, and
 // the parked bot, whose share comes from the pay itself, never from its capped balance.
 const pay=economy&&state.lastPay&&state.lastPay!==t.paid?state.lastPay[p.team]||0:0;
 if(held){
  for(const k of BODY)bot[k]=copy(p[k]);
  pinArms(state,bot);fitAmmo(bot);if(economy)bot.money=clampMoney(t.botMoney-(t.spent||0)+pay);
  delete bot.heldBy;bot.life=(bot.life||0)+1;bot.input={};bot.death=null;bot.dead=0;
  const o=state.objective;if(o){if(o.carrierId===p.id)o.carrierId=bot.id;if(o.actorId===p.id){o.actorId=null;o.actionStarted=0;o.progress=0;}}
 }
 for(const k of BODY)p[k]=t.own[k];
 pinArms(state,p);
 if(economy)p.money=clampMoney(t.own.money+(t.earned||0));
 p.hp=0;p.dead=0;p.death=null;p.life=(p.life||0)+1;p.input={};
 return held?bot:null;
}
// Every takeover of the match, at a round change or a rematch. A bot whose player left without one is put back as it was.
export function releaseTakeovers(state){
 const freed=[];for(const p of Object.values(state.players||{})){const bot=releaseTakeover(state,p);if(bot)freed.push(bot);}
 for(const bot of Object.values(state.players||{}))if(bot.heldBy&&!state.players[bot.heldBy]?.takeover){delete bot.heldBy;freed.push(bot);}
 return freed;
}
