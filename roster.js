export const teamCapacity=v=>[1,2,3,4,5].includes(Number(v))?Number(v):2;
export function teamFor(players,requested,capacity=2){capacity=teamCapacity(capacity);const count=t=>players.filter(p=>p.team===t).length;
 if(['blue','orange'].includes(requested)&&count(requested)<capacity)return requested;
 const open=['blue','orange'].filter(t=>count(t)<capacity);return open.sort((a,b)=>count(a)-count(b))[0]||null;
}
export function replaceableBot(players,requested,capacity){const humanCounts={blue:0,orange:0};for(const p of players)if(!p.bot)humanCounts[p.team]++;
 const team=['blue','orange'].includes(requested)&&humanCounts[requested]<capacity?requested:['blue','orange'].sort((a,b)=>humanCounts[a]-humanCounts[b])[0];
 return players.find(p=>p.bot&&p.team===team)||players.find(p=>p.bot);
}
export function missingBots(players,capacity){capacity=teamCapacity(capacity);return ['blue','orange'].flatMap(team=>Array(Math.max(0,capacity-players.filter(p=>p.team===team).length)).fill(team));}
// V44: original Italian callsigns (plants and stones of the dry south), never a character or a brand from another game or film.
export function nextBotName(players,serial){return ['Ortica','Lentisco','Selce','Carrubo','Ardesia','Sughero'].find(name=>!players.some(p=>p.name===name))||'Recluta '+serial;}
