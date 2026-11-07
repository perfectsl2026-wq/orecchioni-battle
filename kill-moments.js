// V45 kill moments: pure rules for the per-kill facts the host adds to the kill event
// (blind, collateral, last enemy), the local centre banner, clutches and the round MVP.
// No DOM, no Three.js: shared by game.js and tools/check_v45_moments.mjs.
export const STREAK_MS=4000;
const living=(players,team,exceptId=null)=>players.filter(q=>q&&q.team===team&&!q.spectator&&q.hp>0&&q.id!==exceptId).length;
// Host side, once the victim is down. `blindness` is the killer's flash opacity (0..1) at the shot,
// `previous` the key of the killer's previous lethal hit: the same shot or blast twice is a collateral.
export function killFacts({players,killer,victim,roundMode,blindness=0,shotKey='',previous=''}){
 if(!killer||!victim||killer.id===victim.id)return {};
 const facts={};
 if(blindness>.35)facts.blind=true;
 if(shotKey&&shotKey===previous)facts.collateral=true;
 if(roundMode&&living(players,victim.team,victim.id)===0)facts.last=true;
 return facts;
}
// Local streak: kills this round in round modes, kills within STREAK_MS of each other otherwise.
export function nextStreak(prev,{time,roundMode,roundKills}){
 if(roundMode)return {count:roundKills,at:time};
 const count=prev&&Number.isFinite(prev.at)&&time-prev.at<=STREAK_MS?prev.count+1:1;
 return {count,at:time};
}
const WORDS=['','ELIMINAZIONE','DOPPIA','TRIPLA','QUADRUPLA'];
// What the banner says. ACE at five, or at the whole enemy team in a round mode.
export function bannerFor(count,{roundMode,enemyTeam=5,last=false}={}){
 if(count<1)return null;
 const ace=roundMode?(count>=5||(last&&count>=Math.max(2,enemyTeam))):count>=5;
 if(ace)return {tier:5,title:'ACE',detail:roundMode?'SQUADRA AZZERATA':'SERIE DA '+count};
 const tier=Math.min(4,count);
 return {tier,title:WORDS[tier],detail:roundMode?(tier===1?'':tier+' NEL ROUND'):(tier===1?'':'SERIE · '+tier)};
}
// Clutch bookkeeping, per round: the first moment a team is down to one, against how many.
export function noteClutch(clutch,players){
 for(const team of ['blue','orange']){
  if(clutch[team])continue;const mine=players.filter(q=>q.team===team&&!q.spectator&&q.hp>0);
  const other=living(players,team==='blue'?'orange':'blue');
  if(mine.length===1&&other>0&&players.filter(q=>q.team===team&&!q.spectator).length>1)clutch[team]={id:mine[0].id,n:other};
 }
 return clutch;
}
// Round MVP from the winners: clutch first, then a defuse or an exploded plant, then kills.
export function roundMvp({players,kills,winner,planter=null,defuser=null,clutch={},reason=''}){
 const pool=players.filter(q=>!q.spectator&&(!winner||q.team===winner));if(!pool.length)return null;
 const c=winner&&clutch[winner];
 if(c&&pool.some(q=>q.id===c.id))return {id:c.id,reason:'CLUTCH 1 CONTRO '+c.n,kills:kills.get(c.id)||0};
 if(defuser&&/DISINNESC/.test(reason)&&pool.some(q=>q.id===defuser))return {id:defuser,reason:'HA DISINNESCATO LA BOMBA',kills:kills.get(defuser)||0};
 if(planter&&/ESPLOSA/.test(reason)&&pool.some(q=>q.id===planter))return {id:planter,reason:'HA PIAZZATO LA BOMBA',kills:kills.get(planter)||0};
 const best=pool.map(q=>({id:q.id,k:kills.get(q.id)||0,d:q.dealt||0})).sort((a,b)=>b.k-a.k||b.d-a.d)[0];
 if(!best||best.k<1)return null;
 return {id:best.id,reason:best.k===1?'1 ELIMINAZIONE':best.k+' ELIMINAZIONI',kills:best.k};
}
// XP bar steps: from the match-start XP to the new XP, one segment per level crossed (1000 XP a level).
export function xpSegments(from,to,size=1000){
 from=Math.max(0,from|0);to=Math.max(from,to|0);const out=[];let at=from;
 while(true){const level=Math.floor(at/size),end=Math.min(to,(level+1)*size);out.push({level:level+1,from:(at-level*size)/size,to:(end-level*size)/size});if(end>=to||out.length>8)break;at=end;}
 return out;
}
