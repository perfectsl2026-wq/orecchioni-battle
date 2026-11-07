// Smoke grenade. A canister flies like the flashbang and blooms into a cloud that
// blocks sight for 15 s: bots and the radar treat it as opaque, bullets still pass,
// by design. Clouds live in the networked state; ACTIVE mirrors the current ones for
// the cheap line-of-sight tests used every tick.
import {groundHeight} from './shared.js?v=42.0';
export const SMOKE={ms:15000,radius:3.7,growMs:1100,fadeMs:1800,fuseMs:1700,perRound:1};
// V42 Officina tints. Only the hue moves: every tint keeps the grey's brightness and the cloud's
// opacity, radius and timing, so a tinted smoke hides exactly as much as the plain one, for both
// teams. Saturation stays low and away from the two team colours.
// Swatches share the grey's relative luminance (0.410-0.412); the cloud itself is normalised in smoke-fx.
// Sabbia and Ardesia, the two nearest the team cloth colours, are equally desaturated.
export const SMOKE_TINTS=[{label:'Grigio',hex:'#a9ada7'},{label:'Sabbia',hex:'#b9aa95'},{label:'Salvia',hex:'#9cb293'},{label:'Ardesia',hex:'#a5acb9'},{label:'Lavanda',hex:'#b5a6c2'},{label:'Ocra',hex:'#bdaa7a'}];
export const cleanTint=v=>Number.isInteger(v)&&v>=0&&v<SMOKE_TINTS.length?v:0;
export const ACTIVE=[];
export function smokeRadius(s,now){const age=now-s.born,left=s.until-now;if(age<0||left<=0)return 0;
 const grow=1-Math.pow(1-Math.min(1,age/SMOKE.growMs),3),fade=Math.min(1,left/SMOKE.fadeMs);return SMOKE.radius*grow*(.55+.45*fade);}
// Opaque core: the outer fifth of the visible cloud is wispy and does not block.
export function syncSmokes(state,now){
 ACTIVE.length=0;if(state.smokes?.length)state.smokes=state.smokes.filter(s=>now<s.until);
 for(const s of state.smokes||[]){const r=smokeRadius(s,now)*.8;if(r>.4)ACTIVE.push({x:s.x,y:s.y,z:s.z,r,born:s.born});}
}
// Segment a→b against every active cloud (spheres; the part under ground is moot).
export function smokeBlocks(a,b){
 for(const s of ACTIVE){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len2=dx*dx+dy*dy+dz*dz||1e-6;
  const t=Math.max(0,Math.min(1,((s.x-a[0])*dx+(s.y-a[1])*dy+(s.z-a[2])*dz)/len2)),px=a[0]+dx*t-s.x,py=a[1]+dy*t-s.y,pz=a[2]+dz*t-s.z;
  if(px*px+py*py+pz*pz<s.r*s.r)return true;}
 return false;
}
export function insideSmoke(point){let depth=0;for(const s of ACTIVE){const d=Math.hypot(point[0]-s.x,point[1]-s.y,point[2]-s.z);if(d<s.r*1.25)depth=Math.max(depth,1-d/(s.r*1.25));}return depth;}
// Players throw along their aim; bots pass a landing point and get a ballistic arc.
// V42: power is the release (1 left button overhand, .72 both buttons, .42 right button underhand
// lob) and the canister carries the thrower's own velocity, so a running or jumping throw goes
// further and higher, the same way every time.
export function throwSmoke(state,p,now,{eye,target=null,enabled=true,power=1,carry=null,tint=0}={}){
 if(!enabled||p.hp<=0||!(Number.isInteger(p.smokes)&&p.smokes>0)||now<(p.flashReady||0)||p.reload||now<(p.equipUntil||0))return null;
 p.smokes--;p.flashReady=now+1000;p.equipUntil=now+350;
 const g={id:++state.utilitySerial,kind:'smoke',owner:p.id,x:p.x,y:eye,z:p.z,born:now,explodeAt:now+SMOKE.fuseMs,tint:cleanTint(tint)};
 if(target){const T=Math.max(.7,Math.min(1.5,Math.hypot(target.x-p.x,target.z-p.z)/14)),ty=groundHeight(target.x,target.z)+.2;
  g.vx=(target.x-p.x)/T;g.vz=(target.z-p.z)/T;g.vy=(ty-eye+6*T*T)/T;g.explodeAt=now+T*1000+120;}
 else{const f=Number.isFinite(power)?Math.max(.3,Math.min(1,power)):1,speed=13*f,cp=Math.cos(p.pitch||0),lob=f<.5;
  g.vx=-Math.sin(p.yaw)*cp*speed;g.vy=Math.sin(p.pitch||0)*speed+(lob?3.4:2.5);g.vz=-Math.cos(p.yaw)*cp*speed;if(lob)g.y-=.35;
  if(carry){const c=v=>Number.isFinite(v)?Math.max(-9,Math.min(9,v)):0;g.vx+=c(carry[0])*.9;g.vy+=c(carry[1])*.9;g.vz+=c(carry[2])*.9;}}
 state.grenades??=[];state.grenades.push(g);return g;
}
export function bloom(state,g,now){(state.smokes??=[]).push({id:g.id,x:g.x,y:groundHeight(g.x,g.z)+1.5,z:g.z,born:now,until:now+SMOKE.ms,tint:cleanTint(g.tint)});}
