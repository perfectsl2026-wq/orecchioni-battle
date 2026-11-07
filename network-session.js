// The wire format has its own revision; the build tag is read from this module's ?v= query, so
// every release changes the protocol by itself and a page left open is refused with the reload
// message. The room prefix only changes when a release must also part from older pages: a stale page
// on the same prefix reaches the host and hears that message, one on an older prefix finds no room.
export const WIRE_REVISION=32,BUILD_TAG=new URL(import.meta.url).searchParams.get('v')||'dev',NETWORK_PROTOCOL=WIRE_REVISION+'/'+BUILD_TAG,ROOM_PREFIX='ob-room-v42-';
export const validPeerId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
// Bytes queued on the reliable channel beyond which cosmetic traffic is dropped, not delayed.
export const VOLATILE_LIMIT=32768,FAST_CHANNEL_ID=7,FAST_LIMIT=16384;
export function sendPacket(connection,message,{volatile=false,limit=VOLATILE_LIMIT}={}){
 if(!connection?.open||volatile&&(connection.dataChannel?.bufferedAmount||0)>limit)return false;
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
// Second channel on the same connection for position frames and input: unordered and never
// retransmitted, so one lost packet costs one tick instead of stalling everything behind it.
// Events, purchases and the slow state stay on the reliable channel. Both sides create it.
export function openFastChannel(connection,onData){
 const pc=connection.peerConnection;if(!pc?.createDataChannel)return null;
 try{const channel=pc.createDataChannel('ob-fast',{negotiated:true,id:FAST_CHANNEL_ID,ordered:false,maxRetransmits:0});channel.binaryType='arraybuffer';channel.addEventListener('message',e=>onData(e.data));return channel;}catch{return null;}
}
export function sendFast(channel,data){
 if(channel?.readyState!=='open'||channel.bufferedAmount>FAST_LIMIT)return false;
 try{channel.send(data);return true;}catch{return false;}
}
// connectionState reaches failed long before PeerJS notices anything (it only reads the ICE state).
export function watchConnection(connection,onLost){
 const pc=connection.peerConnection;if(!pc?.addEventListener)return;
 pc.addEventListener('connectionstatechange',()=>{if(pc.connectionState==='failed'||pc.connectionState==='closed')onLost();});
}
// A timer the browser does not throttle in a hidden tab. The worker does nothing but tick.
export function startTicker(callback,ms=33){
 let worker=null,timer=0;const fallback=()=>{worker?.terminate();worker=null;timer||=setInterval(callback,ms);};
 try{let url=URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),'+ms+');'],{type:'text/javascript'}));worker=new Worker(url);worker.onmessage=()=>{if(url){URL.revokeObjectURL(url);url=null;}callback();};worker.onerror=fallback;}catch{fallback();}
 return ()=>{worker?.terminate();worker=null;clearInterval(timer);timer=0;};
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
const PLAYER_FIELDS=['id','name','team','tier','tierKills','kills','deaths','assists','dealt','hs','money','primary','arms','sidearm','smokes','hes','fires','kit','bought','buyReady','weapon','yaw','pitch','y','groundY','bot','life','x','z','hp','dead','invulnerable','ammo','reload','reloadStart','duck','jumpV','landingUntil','shots','recoilWeapon','lastShot','vx','vz','speed','armor','helmet','taggedUntil','equipUntil','weaponReady','death','loading','flashes','flashReady','blindAt','blindUntil','blindStrength','operator','net','away','drove','heldBy','purse'];
export function snapshotForNetwork(state){
 const players={};for(const [id,p]of Object.entries(state.players)){
  const view={};for(const field of PLAYER_FIELDS)if(p[field]!==undefined)view[field]=p[field];
  // Other players only render the finish of the currently equipped weapon.
  view.finishes={[p.weapon]:p.finishes?.[p.weapon]};players[id]=view;
 }
 return {...state,players,killEvents:(state.killEvents||[]).filter(e=>state.now-e.time<=8000)};
}
// Position frames: every tick, one small binary record per player, the same bytes for every guest.
// Everything else travels as a reliable delta of what changed, so a 5v5 snapshot of about 7 KB
// becomes about 330 B plus the changes.
const FRAME_MAGIC=0xb2,FRAME_HEADER=19,FRAME_ENTRY=30,ANGLE=32768/Math.PI;
const FAST_FIELDS=new Set(['x','y','z','groundY','yaw','pitch','duck','vx','vz','speed','jumpV','hp','life','weapon']);
const short=v=>Math.max(-32768,Math.min(32767,Math.round(v)||0));
const wrap=v=>Math.atan2(Math.sin(v||0),Math.cos(v||0));
export function encodeFrame(state,{hidden=false,ack=null}={}){
 const list=Object.values(state.players),bytes=new ArrayBuffer(FRAME_HEADER+FRAME_ENTRY*list.length),v=new DataView(bytes);
 v.setUint8(0,FRAME_MAGIC);v.setUint8(1,hidden?1:0);v.setUint8(2,list.length);v.setFloat64(3,state.now,true);v.setFloat64(11,state.started,true);
 let at=FRAME_HEADER;for(const p of list){
  const a=ack?.(p);
  v.setUint16(at,p.net||0,true);v.setUint16(at+2,(p.life||0)&0xffff,true);v.setInt16(at+4,short(p.x*100),true);v.setInt16(at+6,short(p.z*100),true);v.setInt16(at+8,short((p.y||0)*100),true);v.setInt16(at+10,short((p.groundY||0)*100),true);
  v.setInt16(at+12,short(wrap(p.yaw)*ANGLE),true);v.setInt16(at+14,short((p.pitch||0)*ANGLE),true);v.setInt16(at+16,short((p.vx||0)*100),true);v.setInt16(at+18,short((p.vz||0)*100),true);v.setInt16(at+20,short((p.jumpV||0)*100),true);
  v.setUint16(at+22,Math.max(0,Math.min(65535,Math.round((p.speed||0)*100))),true);v.setUint8(at+24,Math.round(Math.max(0,Math.min(1,p.duck||0))*255));v.setUint8(at+25,Math.max(0,Math.min(255,p.hp|0)));v.setUint8(at+26,p.weapon&255);
  v.setUint16(at+27,a?a.seq&0xffff:0xffff,true);v.setUint8(at+29,a?Math.min(255,Math.max(0,Math.round(a.age))):255);at+=FRAME_ENTRY;
 }
 return bytes;
}
export function decodeFrame(bytes){
 if(!(bytes instanceof ArrayBuffer)&&!ArrayBuffer.isView(bytes))return null;const buffer=bytes instanceof ArrayBuffer?bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 if(buffer.byteLength<FRAME_HEADER)return null;const v=new DataView(buffer),count=v.getUint8(2);if(v.getUint8(0)!==FRAME_MAGIC||buffer.byteLength!==FRAME_HEADER+FRAME_ENTRY*count)return null;
 const frame={hidden:!!(v.getUint8(1)&1),now:v.getFloat64(3,true),started:v.getFloat64(11,true),players:[]};if(!Number.isFinite(frame.now)||!Number.isFinite(frame.started))return null;
 for(let n=0,at=FRAME_HEADER;n<count;n++,at+=FRAME_ENTRY)frame.players.push({net:v.getUint16(at,true),life:v.getUint16(at+2,true),x:v.getInt16(at+4,true)/100,z:v.getInt16(at+6,true)/100,y:v.getInt16(at+8,true)/100,groundY:v.getInt16(at+10,true)/100,yaw:v.getInt16(at+12,true)/ANGLE,pitch:v.getInt16(at+14,true)/ANGLE,vx:v.getInt16(at+16,true)/100,vz:v.getInt16(at+18,true)/100,jumpV:v.getInt16(at+20,true)/100,speed:v.getUint16(at+22,true)/100,duck:v.getUint8(at+24)/255,hp:v.getUint8(at+25),weapon:v.getUint8(at+26),ack:v.getUint16(at+27,true),ackAge:v.getUint8(at+29)});
 return frame;
}
// A signature is compared by value and shared between connections; each connection only remembers the last one it was sent.
const signed=v=>v!==null&&typeof v==='object'?JSON.stringify(v):v;
export function snapshotSignature(view){
 const top={},players={};for(const [key,value]of Object.entries(view))if(key!=='players'&&key!=='now')top[key]=signed(value);
 for(const [id,p]of Object.entries(view.players)){const s={};for(const [field,value]of Object.entries(p))if(!FAST_FIELDS.has(field))s[field]=signed(value);players[id]=s;}
 return {top,players};
}
function changed(now,before,source){let set=null,clear=null;for(const key of Object.keys(now))if(now[key]!==before[key])(set??={})[key]=source[key];for(const key of Object.keys(before))if(!(key in now))(clear??=[]).push(key);return set||clear?{set,clear}:null;}
// What a connection needs to catch up from `before`, or null when nothing changed.
export function buildDelta(view,now,before){
 const delta={},top=changed(now.top,before.top,view);if(top)delta.top=top;
 for(const id of Object.keys(now.players)){if(!before.players[id]){(delta.joined??={})[id]=view.players[id];continue;}const change=changed(now.players[id],before.players[id],view.players[id]);if(change)(delta.players??={})[id]=change;}
 for(const id of Object.keys(before.players))if(!now.players[id])(delta.gone??=[]).push(id);
 return Object.keys(delta).length?delta:null;
}
function patch(target,change){if(change.set)for(const key of Object.keys(change.set))if(key!=='__proto__')target[key]=change.set[key];for(const key of change.clear||[])delete target[key];}
// Guest copy of the host's state: the join snapshot, reliable deltas and frames that may arrive
// late, twice or never. Every read hands out fresh player objects, as a decoded snapshot did.
export class SnapshotMirror{
 constructor(){this.base=null;this.index=new Map();this.frameNow=-Infinity;this.hostHidden=false;}
 reindex(){this.index.clear();for(const p of Object.values(this.base.players))if(p.net)this.index.set(p.net,p);}
 full(snapshot){this.base={...snapshot,players:{...snapshot.players}};this.frameNow=-Infinity;this.reindex();return this.view();}
 delta(d){
  if(!this.base||!d||typeof d!=='object')return null;
  if(d.top)patch(this.base,d.top);if(d.joined)Object.assign(this.base.players,d.joined);
  if(d.players)for(const id of Object.keys(d.players))if(this.base.players[id])patch(this.base.players[id],d.players[id]);
  for(const id of d.gone||[])delete this.base.players[id];
  if(d.joined||d.gone||d.players)this.reindex();return this.view();
 }
 frame(f){
  if(!this.base||!f||f.started!==this.base.started||f.now<=this.frameNow)return null;this.frameNow=f.now;this.hostHidden=f.hidden;this.base.now=Math.max(this.base.now,f.now);
  for(const entry of f.players){const p=this.index.get(entry.net);if(!p)continue;for(const field of FAST_FIELDS)p[field]=entry[field];}
  return this.view();
 }
 view(){const players={};for(const [id,p]of Object.entries(this.base.players))players[id]={...p,ammo:Array.isArray(p.ammo)?p.ammo.slice():p.ammo};return {...this.base,players};}
}
