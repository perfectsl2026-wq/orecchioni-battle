export const NETWORK_PROTOCOL=30,ROOM_PREFIX='breachyard-v30-';
export const validPeerId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
export function sendPacket(connection,message,{volatile=false}={}){
 if(!connection?.open||volatile&&(connection.dataChannel?.bufferedAmount||0)>262144)return false;
 try{connection.send(message);return true;}catch(error){console.warn('Invio multiplayer interrotto:',error?.message||'canale chiuso');return false;}
}
// Each attempt owns its callbacks and timers. An abandoned attempt cannot
// destroy its successor or start a match after asynchronous map loading.
export class NetworkSession{
 constructor(peer){this.peer=peer;this.active=true;this.timers=new Set();}
 after(ms,fn){const timer=setTimeout(()=>{this.timers.delete(timer);if(this.active)fn();},ms);this.timers.add(timer);return timer;}
 cancel(timer){clearTimeout(timer);this.timers.delete(timer);}
 close(){if(!this.active)return;this.active=false;for(const timer of this.timers)clearTimeout(timer);this.timers.clear();try{this.peer.destroy();}catch{}}
}
export function validSnapshot(s,id){
 if(!s||typeof s!=='object'||!s.players||typeof s.players!=='object'||!Number.isFinite(s.now)||!Number.isFinite(s.started)||!s.score||!Number.isFinite(s.score.blue)||!Number.isFinite(s.score.orange))return false;
 const players=Object.values(s.players);if(players.length<1||players.length>10||id&&!Object.hasOwn(s.players,id))return false;
 return players.every(p=>p&&typeof p.id==='string'&&['blue','orange'].includes(p.team)&&[p.x,p.z,p.yaw,p.hp,p.life,p.weapon].every(Number.isFinite)&&Number.isInteger(p.weapon)&&p.weapon>=0&&p.weapon<=5&&Array.isArray(p.ammo)&&p.ammo.length===6&&p.ammo.every(Number.isFinite));
}
export function snapshotIssue(s,id){
 if(!s||typeof s!=='object')return 'stato assente';
 if(!Number.isFinite(s.now)||!Number.isFinite(s.started))return 'orologio';
 if(!s.score||!Number.isFinite(s.score.blue)||!Number.isFinite(s.score.orange))return 'punteggio';
 if(!s.players||id&&!Object.hasOwn(s.players,id))return 'operatore locale assente';
 const ps=Object.values(s.players);if(!ps.length||ps.length>10)return 'numero operatori';
 for(const p of ps){if(!p)return 'operatore assente';if(typeof p.id!=='string')return 'identificativo';if(!['blue','orange'].includes(p.team))return 'squadra';for(const key of ['x','z','yaw','hp','life','weapon'])if(!Number.isFinite(p[key]))return 'campo '+key;if(!Array.isArray(p.ammo)||p.ammo.length!==6||!p.ammo.every(Number.isFinite))return 'munizioni';}
 return 'nessuna anomalia nei campi';
}
const PLAYER_FIELDS=['id','name','team','kills','deaths','assists','dealt','hs','money','primary','smokes','hes','fires','kit','bought','buyReady','weapon','yaw','pitch','y','groundY','bot','life','x','z','hp','dead','invulnerable','ammo','reload','reloadStart','duck','jumpV','landingUntil','shots','recoilWeapon','lastShot','vx','vz','speed','armor','helmet','taggedUntil','equipUntil','weaponReady','death','loading','flashes','flashReady','blindAt','blindUntil','blindStrength','operator'];
export function snapshotForNetwork(state){
 const players={};for(const [id,p]of Object.entries(state.players)){
  const view={};for(const field of PLAYER_FIELDS)if(p[field]!==undefined)view[field]=p[field];
  // Other players only render the finish of the currently equipped weapon.
  view.finishes={[p.weapon]:p.finishes?.[p.weapon]};players[id]=view;
 }
 return {...state,players,killEvents:(state.killEvents||[]).filter(e=>state.now-e.time<=8000)};
}
