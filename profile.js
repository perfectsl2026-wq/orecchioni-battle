import {cleanLoadout,cleanFinish,PATTERNS} from './weapon-finish.js?v=42.0';
import {cleanOperator,cleanTw,KITS} from './operator-kits.js?v=42.0';
// V46f: the Officina tweaks are kept per kit (each operator remembers its own); the operator carries only its current kit's code.
const cleanTweaks=v=>{const o={};for(const {id} of KITS){const t=cleanTw(id,v?.[id]);if(t)o[id]=t;}return o;};
import {cleanEmblem,emblemUnlocked} from './emblems.js?v=42.0';
const number=(v,max=1e8)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export class Career{
 constructor(storage){if(!arguments.length)try{storage=globalThis.localStorage;}catch{}this.storage=storage;this.persisted=!!storage;let v;try{v=JSON.parse(storage?.getItem('ob-career-v1')||'null');}catch{}
  this.data={xp:number(v?.xp),kills:Array.from({length:6},(_,i)=>number(v?.kills?.[i])),matches:number(v?.matches),wins:number(v?.wins),finishes:cleanLoadout(v?.finishes),tweaks:cleanTweaks(v?.tweaks),operator:cleanOperator(v?.operator),emblem:cleanEmblem(v?.emblem)||'punta',recent:Array.isArray(v?.recent)?v.recent.filter(x=>typeof x==='string').slice(-128):[]};
  if(this.data.operator?.kit)this.data.operator={...this.data.operator,tw:this.data.tweaks[this.data.operator.kit]||''};
  this.seen=new Set(this.data.recent);
 }
 save(){try{if(!this.storage?.setItem){this.persisted=false;return false;}this.data.recent=[...this.seen].slice(-128);this.storage?.setItem('ob-career-v1',JSON.stringify(this.data));this.persisted=true;return true;}catch{this.persisted=false;return false;}}
 remember(key){if(this.seen.has(key))return false;this.seen.add(key);if(this.seen.size>128)this.seen.delete(this.seen.values().next().value);return true;}
 kill(e,localId){if(e.killerId!==localId||e.victimId===localId||!Number.isInteger(e.weapon)||e.weapon<0||e.weapon>7||!e.eventId||!this.remember('k:'+e.eventId))return 0;const xp=100+(e.headshot?50:0);if(e.weapon<=5)this.data.kills[e.weapon]++;this.data.xp+=xp;this.save();return xp;}
 complete(state,localId){const team=state.players?.[localId]?.team;if(!state.ended||state.preview||!['blue','orange'].includes(team)||!Number.isFinite(state.started)||!this.remember('m:'+state.started))return 0;const other=team==='blue'?'orange':'blue',won=state.forfeit?state.forfeit!==team:state.score[team]>state.score[other],xp=won?300:150;this.data.matches++;if(won)this.data.wins++;this.data.xp+=xp;this.save();return xp;}
 canUse(index,pattern){return !!PATTERNS[pattern]&&this.data.kills[index]>=PATTERNS[pattern].kills;}
 setFinish(index,value){if(!Number.isInteger(index)||index<0||index>5)return false;const v=cleanFinish(value);if(v.style==='paint'&&!this.canUse(index,v.pattern))return false;this.data.finishes[index]=v;this.save();return true;}
 setEmblem(id){if(!emblemUnlocked(id,this.level))return false;this.data.emblem=id;this.save();return true;}
 setOperator(value){const kit=cleanOperator(value).kit;this.data.operator=cleanOperator({...value,tw:this.data.tweaks[kit]||''});this.save();return true;}
 setTweak(kit,code){const t=cleanTw(kit,code);if(t)this.data.tweaks[kit]=t;else delete this.data.tweaks[kit];if(this.data.operator.kit===kit)this.data.operator=cleanOperator({...this.data.operator,tw:t});this.save();return true;}
 get level(){return 1+Math.floor(this.data.xp/1000);}
 get totalKills(){return this.data.kills.reduce((a,b)=>a+b,0);}
}
