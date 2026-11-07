// V40 dressing: the lived-in layer of the three maps. Everything here is cosmetic and sits
// where it cannot change play: above the 1.0–2.0 m head band, flush on a wall, flat on the
// ground, or outside the playable boundary. Models are the V40 parts of street-props.js.
import {blocked,groundHeight,wallDistance} from './shared.js?v=42.0';
const hash=(x,z)=>{const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);};
// Point on a facade frame: u along the wall, out away from it.
const onWall=(x,z,angle,u,out)=>[x+Math.cos(angle)*u+Math.sin(angle)*out,z-Math.sin(angle)*u+Math.cos(angle)*out];
const wallProp=(sp,part,{x,z,angle},u,y,out,scale,tag='facade')=>{const [px,pz]=onWall(x,z,angle,u,out);sp.add(part,{x:px,y,z:pz,yaw:angle,scale,tag});};
const WINDOW_START=1.65,WINDOW_STEP=5.2,SILL=3.9;
// Sahra street facades: pots on some sills, a rubbish bag or two in the corner of a long wall.
export function streetFacade(sp,face){
 const {width,serial,ground=0}=face;
 for(let u=-width/2+WINDOW_START;u<width/2-1.1;u+=WINDOW_STEP){
  const r=hash(u+serial*3.3,width);if(r<.68)continue;
  wallProp(sp,'vaso_piccolo',face,u-.2,SILL+.02,.18,.0085);
  if(r>.86)wallProp(sp,'vaso_alto',face,u+.24,SILL+.02,.18,.0062);
 }
 if(width>=8&&serial%4===1){const u=(hash(serial,1.3)>.5?1:-1)*(width/2-.7);wallProp(sp,'sacchi',face,u,ground,.42,.36,'ground');}
}
// Covered souk: carpets for sale hang above head height between the stone piers.
export function soukFacade(sp,face){
 const {width,serial}=face;if(width<4)return;
 for(let u=-width/2+2.8,n=0;u<width/2-1.4;u+=4,n++){if(hash(u,serial*1.7)<.34)continue;
  if((serial+n)%2)wallProp(sp,'tappeto',face,u,2.1,.1,.0029);else wallProp(sp,'tappeto_b',face,u,2.15,.1,1.75);}
}
// A warm pierced lantern under each covered bay, on a short chain drawn by the caller.
export const soukLantern=(sp,x,under,z)=>sp.add('lanterna',{x,y:under-1.02,z,yaw:x+z,scale:.26,tag:'lantern'});
// Date palms standing behind the houses: their crowns break the skyline above every roof.
export function palmGrove(sp,ground=()=>0){
 for(const [x,z,s] of [[46,-2,2.3],[-47,6,2.1],[24,-50,2.2],[-40,-51,1.95],[52,22,2.4],[-54,34,2.25],[34,56,2.05],[-22,57,2.3],[6,-63,2.15],[55,-31,1.95],[-58,-16,2.4],[12,58,1.9]])
  sp.add('palma_lontana',{x,y:ground(x,z),z,yaw:x*1.7+z,scale:s,tag:'far'});
}
// Washing strung between two walls well above the fight; the line is scaled to the alley.
export function laundry(sp,spots){
 for(const [x,z,y,alongX] of spots){
  const d=alongX?[1,0,0]:[0,0,1],a=wallDistance([x,y,z],d,12),b=wallDistance([x,y,z],d.map(v=>-v),12),span=Math.min(a+b,12);if(span<3.5||span>11.5)continue;
  const m=(a-b)/2;sp.add('bucato',{x:x+(alongX?m:0),y,z:z+(alongX?0:m),yaw:alongX?Math.PI/2:0,scale:span/34.5,tag:'line'});
 }
}
// Flat cast-iron covers on the level parts of the streets.
export function manholes(sp,walk,seed=0,{limit=9,skip=()=>false}={}){
 let placed=0;
 for(const r of walk){if(placed>=limit)break;
  const x=r[0]+(r[1]-r[0])*(.3+.4*hash(r[0]+seed,r[2])),z=r[2]+(r[3]-r[2])*(.3+.4*hash(r[3],r[1]+seed)),y=groundHeight(x,z);
  if(blocked(x,z,.7)||skip(x,z))continue;if([[.5,0],[-.5,0],[0,.5],[0,-.5]].some(([a,b])=>Math.abs(groundHeight(x+a,z+b)-y)>.01))continue;
  sp.add('tombino',{x,y:y+.002,z,yaw:hash(x,z)*6.28,scale:.72,tag:'ground'});placed++;
 }
 return placed;
}
// Caldera: station fixtures on the facades.
export function stationFixtures(sp,face){
 const {width,serial,ground=0,height}=face;if(width<4)return;
 if(serial%4===1)wallProp(sp,'estintore',face,-(width/2-1.1),ground+.6,.1,.008);
 if(serial%5===2&&height>5)wallProp(sp,'telecamera',face,width/2-.7,ground+3.5,.14,.2);
 if(serial%7===3&&height>6.4)wallProp(sp,'scala',face,width/2-1.6,ground+2.75,.08,1.12);
}
// Caldera: ship on the roads, a working pier, wind farm on the rim, lifebuoys on the sea rail.
export function calderaDress(sp,map,{rimAt}){
 sp.add('nave',{x:-176,y:-9,z:96,yaw:.42,scale:.72,tag:'far'});
 sp.add('gru',{x:-112,y:-1.2,z:-92,yaw:2.1,scale:.82,tag:'far'});sp.add('gru',{x:-138,y:-1.2,z:-70,yaw:2.5,scale:.82,tag:'far'});
 sp.add('molo',{x:-125,y:-3,z:-81,yaw:-.72,fit:{w:18,d:64,h:3.2},tag:'far'});
 sp.add('isola',{x:-86,y:-3,z:22,yaw:.6,fit:{w:24,d:22,h:8},tag:'far'});sp.add('faro',{x:-86,y:3.6,z:22,scale:14,tag:'far'});
 for(const a of [.3,.5,.7,.88,-.4,-.7]){const {x,z,y}=rimAt(a);sp.add('turbina',{x,y:y-1,z,yaw:-a+Math.PI/2,scale:2.1,tag:'far'});}
 for(const [x,z,k] of [[-44,8,1.5],[-58,28,1.7],[-36,44,1.4],[14,58,1.6],[-70,-18,1.8]])sp.add('boa',{x,y:-1.5,z,yaw:x,scale:k,tag:'far'});
 // Lifebuoys hang on the inner side of the sea rail, one every eleven metres.
 for(const [x0,x1,z0,z1] of map.parapets||[]){const alongX=x1-x0>=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2,len=alongX?x1-x0:z1-z0;
  for(let u=-len/2+3.5;u<len/2-2;u+=11){const px=alongX?cx+u:cx,pz=alongX?cz:cz+u,wall=map.walls.find(w=>Math.abs(w[0]-px)<=w[2]/2&&Math.abs(w[1]-pz)<=w[3]/2);if(!wall)continue;
   const inner=(alongX?cz:cx)>0?-1:1;sp.add('salvagente',{x:alongX?px:px+inner*(wall[2]/2+.04),y:wall[4]+.16,z:alongX?pz+inner*(wall[3]/2+.04):pz,yaw:alongX?0:Math.PI/2,scale:.28,tag:'facade'});}}
}
// Forge: larches on the slopes, a power line leaving the valley, service runs on the walls.
export const FORGE_PYLONS=[[-74,-46],[-30,-84],[24,-92],[78,-62]];
export function forgeDress(sp,{terrainAt}){
 for(let i=0;i<64;i++){const a=i*2.39996+.3,r=38+hash(i,3.1)*58,x=Math.cos(a)*r,z=Math.sin(a)*r;sp.add('abete',{x,y:terrainAt(x,z)-.4,z,yaw:i*1.9,scale:.19+hash(i,7.7)*.1,tag:'pine'});}
 FORGE_PYLONS.forEach(([x,z],i,all)=>{const n=all[Math.min(i+1,all.length-1)],p=all[Math.max(i-1,0)];sp.add('traliccio',{x,y:terrainAt(x,z)-.5,z,yaw:Math.atan2(n[0]-p[0],n[1]-p[1])+Math.PI/2,scale:.0145,tag:'far'});});
 for(const [x,y,z,a,k] of [[-17.44,2.75,11,Math.PI/2,1.2],[17.44,2.75,-7,-Math.PI/2,1.2],[-9,2.75,-19.44,0,1.2],[9,2.75,19.44,Math.PI,1.2]])sp.add('scala',{x,y,z,yaw:a,scale:k,tag:'facade'});
 // Each turbine hall gets an extinguisher by the door, a camera and two isolating valves.
 for(const [hx,hz] of [[-12,-12],[12,-12],[-12,12],[12,12]])for(const side of [-1,1]){
  const f={x:hx,z:hz+side*4.5,angle:side>0?0:Math.PI};
  wallProp(sp,'estintore',f,1.5,.6,.1,.008);wallProp(sp,'telecamera',f,-2.4,2.72,.14,.2);
  wallProp(sp,'valvola',f,2.2,2.62,.11,.2);wallProp(sp,'valvola',f,-1.6,2.62,.11,.16);
 }
}
