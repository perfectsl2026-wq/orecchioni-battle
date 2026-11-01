import {resetObjective,objectiveResult,objectiveEnabled,attackFor} from './objective-rules.js?v=40.0';
import {MAPS} from './shared.js?v=40.0';
import {teamCapacity} from './roster.js?v=40.0';
import {ECONOMY,economyOn,carryRound,payRound,botBuy} from './economy.js?v=40.0';
// V29 modes: bomb rounds (Competitivo on Sahra, Wingman on Caldera, with per-map
// defaults) and team deathmatch with instant respawn for warm-up.
export const MATCH_MODES={demolition:{label:'COMPETITIVO',target:7,roundMs:120000,freezeMs:4000,resultMs:4500},deathmatch:{label:'DEATHMATCH',target:30,durationMs:480000}};
export const isRoundMode=mode=>mode==='demolition';
export const mapAllowsMode=(map,mode)=>Object.hasOwn(MATCH_MODES,mode)&&(MAPS[map]?.modes||Object.keys(MATCH_MODES)).includes(mode);
// The first allowed mode is each map's showcase format.
export const defaultMode=map=>(MAPS[map]?.modes||['demolition'])[0];
export const modeRules=(mode,map)=>({...(Object.hasOwn(MATCH_MODES,mode)?MATCH_MODES[mode]:MATCH_MODES.demolition),...MAPS[map]?.rules?.[mode]});
export const matchRules=state=>({...modeRules(state.mode,state.map),...state.rules});
export function cleanRules(mode,options={},map){const base=modeRules(mode,map),pick=(v,list,fallback)=>list.includes(Number(v))?Number(v):fallback;return {target:pick(options.target,isRoundMode(mode)?[5,7,9]:[10,20,30,50],base.target),...(isRoundMode(mode)?{roundMs:pick(options.roundMs,[60000,90000,120000],base.roundMs)}:{durationMs:pick(options.durationMs,[300000,480000,600000],base.durationMs)})};}
export const isRespawnMode=mode=>mode==='deathmatch';
export const allowedWeapons=mode=>modeRules(mode).weapons||[0,1,2,3,4,5];
export const weaponAllowed=(mode,index)=>allowedWeapons(mode).includes(index);
export const teamName=t=>t==='blue'?'VANGUARD':'OUTRIDERS';
export function createMatch(mode,now,difficulty,map='sahra',options={}){mode=mapAllowsMode(map,mode)?mode:defaultMode(map);return {map,teamSize:teamCapacity(options.teamSize),fillBots:!!options.fillBots,botWeapon:[1,2,3,4].includes(Number(options.botWeapon))?Number(options.botWeapon):null,rules:cleanRules(mode,options,map),mode:Object.hasOwn(MATCH_MODES,mode)?mode:'demolition',difficulty,players:{},economy:mode==='demolition'&&options.economy!==false,lossStreak:{blue:0,orange:0},killEvents:[],history:[],grenades:[],smokes:[],utilitySerial:0,score:{blue:0,orange:0},started:now,now,ended:false,phase:'waiting',round:0,phaseUntil:0};}
export function beginRound(state,now,spawn){
 // Half time comes after target-1 rounds: sides swap and the economy restarts.
 const half=Math.max(1,(matchRules(state).target||7)-1);carryRound(state,{halfTime:state.round>0&&state.round%half===0});
 state.round++;if(objectiveEnabled(state))state.attackTeam=attackFor(state);state.phase='freeze';state.phaseUntil=now+freezeMs(state);state.roundEnds=state.phaseUntil+matchRules(state).roundMs;state.roundWinner=null;state.roundReason='';
 for(const p of Object.values(state.players))if(!p.loading)spawn(p);
 resetObjective(state);
 for(const p of Object.values(state.players))if(p.bot&&!p.loading)botBuy(state,p,state.botWeapon);
}
// The buy phase replaces the short freeze when the economy is on.
export const freezeMs=state=>economyOn(state)?ECONOMY.buyMs:MATCH_MODES.demolition.freezeMs;
export function canAct(state){return !state.ended&&(isRespawnMode(state.mode)||state.phase==='live');}
export function updateMatch(state,now,spawn,emit=()=>{}){
 if(state.ended)return;
 if(isRespawnMode(state.mode)){
  const rules=matchRules(state);
  if(now-state.started>=rules.durationMs||Math.max(state.score.blue,state.score.orange)>=rules.target)state.ended=true;
  return;
 }
 const players=Object.values(state.players).filter(p=>!p.loading),both=['blue','orange'].every(t=>players.some(p=>p.team===t));
 if(!both&&!(objectiveEnabled(state)&&state.phase==='live')){state.phase='waiting';state.phaseUntil=0;return;}
 if(state.phase==='waiting'){beginRound(state,now,spawn);emit({kind:'round',phase:'freeze',round:state.round});return;}
 if(state.phase==='freeze'&&now>=state.phaseUntil){state.phase='live';state.liveAt=now;emit({kind:'round',phase:'live',round:state.round});}
 if(state.phase==='result'){
  if(now>=state.phaseUntil){beginRound(state,now,spawn);emit({kind:'round',phase:'freeze',round:state.round});}
  return;
 }
 if(state.phase!=='live')return;
 const alive={blue:players.filter(p=>p.team==='blue'&&p.hp>0).length,orange:players.filter(p=>p.team==='orange'&&p.hp>0).length};
 let winner,reason;
 if(objectiveEnabled(state)){const result=objectiveResult(state,now,alive);if(!result)return;winner=result.winner;reason=result.reason;}
 else if(!alive.blue||!alive.orange){winner=alive.blue?'blue':alive.orange?'orange':null;reason='ELIMINAZIONE SQUADRA';}
 else if(now>=state.roundEnds){winner=null;reason='TEMPO SCADUTO';}
 else return;
 state.roundWinner=winner;state.roundReason=reason;state.phase='result';state.phaseUntil=now+MATCH_MODES.demolition.resultMs;
 if(winner)state.score[winner]++;
 payRound(state,winner,reason);
 // Compact round strip for the scoreboard: winner and how the round ended.
 (state.history??=[]).push({w:winner,r:/BOMBA ESPLOSA/.test(reason)?'bomb':/DISINNESC/.test(reason)?'defuse':/TEMPO/.test(reason)?'time':'kill'});
 if(Math.max(state.score.blue,state.score.orange)>=matchRules(state).target)state.ended=true;
 emit({kind:'round',phase:'result',winner,reason,round:state.round,ended:state.ended});
}
