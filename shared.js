import {SAHRA} from './sahra-layout.js?v=42.0';
import {CALDERA} from './caldera-layout.js?v=42.0';
export const WEAPONS=[{name:'OB-110 SMERIGLIO',label:'PISTOLA',mag:12,damage:32,rate:.18,reload:1.25,equip:.28,spread:.007,range:90,auto:false,color:0x303e42},{name:'OB-210 ASSILLO',label:'MITRA',mag:30,damage:25,rate:.075,reload:1.7,equip:.34,spread:.026,range:65,auto:true,color:0x253436},{name:'OB-310 RONCOLA',label:'ASSALTO',mag:30,damage:34,rate:.115,reload:2.2,equip:.4,spread:.014,range:120,auto:true,color:0x7c5235},{name:'OB-320 TARLO',label:'ASSALTO',mag:30,damage:27,rate:.09,reload:1.95,equip:.4,spread:.009,range:120,auto:true,color:0x334444},{name:'OB-510 AVERLA',label:'PRECISIONE',mag:5,damage:115,rate:1.2,reload:2.8,equip:.65,spread:.018,aimSpread:.00025,range:180,auto:false,color:0x53614c},{name:'K-07',label:'COLTELLO',mag:0,damage:35,rate:.42,reload:0,equip:.2,range:1.85,auto:true,melee:true,color:0x7c9492}];
// x,z,width,depth,height,material. All walls are shared by rendering, collision and hitscan.
export const MAX_PLAYERS=10;
export {teamFor as chooseTeam} from './roster.js?v=42.0';
export const MAPS={sahra:SAHRA,caldera:CALDERA};
// FORGE / 11: compact symmetric warm-up arena for deathmatch.
const FORGE_ARCHES=[{x:-8,z:0,width:5,spring:2,rise:1.4,height:4.4,depth:1.2},{x:8,z:0,width:5,spring:2,rise:1.4,height:4.4,depth:1.2}];
MAPS.forge={id:'forge',title:'FORGE / 11',short:'FORGE',menuCamera:{position:[-14,2.4,-2],look:[10,3.5,2]},description:'Centrale alpina · calcestruzzo chiaro, rame e turbine monumentali',bounds:{x:17.3,z:19.3},
 walls:[[-18,0,1,41,7,0],[18,0,1,41,7,0],[0,-20,37,1,7,0],[0,20,37,1,7,0],[-12,-12,6,9,7.4,0],[12,-12,6,9,7.4,0],[-12,12,6,9,7.4,0],[12,12,6,9,7.4,0],[-8,-4.8,1.2,4.6,4.4,0],[-8,4.8,1.2,4.6,4.4,0],[8,-4.8,1.2,4.6,4.4,0],[8,4.8,1.2,4.6,4.4,0],[-8.8,-7.3,.4,.4,4.4,0],[-8.8,7.3,.4,.4,4.4,0],[8.8,-7.3,.4,.4,4.4,0],[8.8,7.3,.4,.4,4.4,0],[0,0,.8,.8,5.4,4],[-4.8,-5,2.5,1.8,2.05,1],[4.8,5,2.5,1.8,2.05,1],[-3,-12.4,3.2,1.2,1.8,2],[3,-12.4,3.2,1.2,1.8,2],[3,12.4,3.2,1.2,1.8,2],[-3,12.4,3.2,1.2,1.8,2],[-6.7,9.3,1.5,2.4,1.45,2],[6.7,-9.3,1.5,2.4,1.45,2]],arches:FORGE_ARCHES,spawns:{blue:[[3,-17.8],[-6,-18],[-3,-17.8],[6,-18]],orange:[[-3,17.8],[6,18],[3,17.8],[-6,18]]},zones:[[-6,6,-17,-8,'CORTE NORD'],[-6,6,8,17,'CORTE SUD'],[-7,7,-8,8,'CENTRALE'],[-17,-9,-4,4,'CORTILE OVEST'],[9,17,-4,4,'CORTILE EST'],[-17,-9,-19,19,'CORSIA OVEST'],[9,17,-19,19,'CORSIA EST'],[-9,9,-19,-8,'CORTE NORD'],[-9,9,8,19,'CORTE SUD']]};
// V42 (FORGE-05): the generator in the middle is a deck you can stand on, 1.15 m up, with four steps at its
// east and west ends; the long sides take a jump. Ground stops bullets through groundDistance, and crouching
// behind it (eye 1.07 m) is still cover. `decks` keeps it drawn and on the radar now that it is no wall.
MAPS.forge.decks=[[0,0,5.4,3.4,1.15,3]];
MAPS.forge.ground=(x,z)=>{if(Math.abs(z)>1.7)return 0;const ax=Math.abs(x);if(ax<=2.7)return 1.15;const n=Math.ceil((ax-2.7)/.3);return n>=4?0:1.15*(4-n)/4;};
MAPS.forge.ballisticCylinders=[{x:0,y:6.2,z:0,radius:.82,length:14},...[-6,-3,0,3,6].map(x=>({x,y:6.2,z:0,radius:1.02,length:.16}))];
// V29 curated pool: SAHRA is the 5v5 Squadra map (two sites), CALDERA the
// Binomio map (one site, 2v2 or 3v3, short rounds), FORGE the warm-up arena.
Object.assign(MAPS.sahra,{pool:'squadra',utility:true,modes:['demolition','deathmatch','corsa']});
Object.assign(MAPS.caldera,{pool:'binomio',utility:true,modes:['demolition','deathmatch','corsa'],rules:{demolition:{target:9,roundMs:90000}}});
Object.assign(MAPS.forge,{pool:'arena',modes:['deathmatch','corsa'],lobby:{kicker:'ARENA · RISCALDAMENTO',name:'FORGE',code:'11',subtitle:'CENTRALE ALPINA',lanes:'arena simmetrica',tagline:'Centrale alpina compatta per scaldare la mira prima delle partite: deathmatch a squadre con rientro immediato.'}});
export let BOUNDS=SAHRA.bounds,WALLS=SAHRA.walls,ARCHES=SAHRA.arches,SPAWNS=SAHRA.spawns;
export let ACTIVE_MAP='sahra';const worldListeners=new Set();
export function onWorldChange(listener){worldListeners.add(listener);return()=>worldListeners.delete(listener);}
export function configureMap(id){const map=Object.hasOwn(MAPS,id)?MAPS[id]:null;if(!map)throw new Error('Mappa non riconosciuta: '+id);if(ACTIVE_MAP===id)return map;ACTIVE_MAP=id;BOUNDS=map.bounds;WALLS=map.walls;ARCHES=map.arches;SPAWNS=map.spawns;for(const listener of worldListeners)listener(map);return map;}
// Uniform 2 m grid over the active solids for blocked(): each wall and each oriented
// movement box (door leaves, vehicles) is listed in every cell that its footprint,
// grown by GRID_REACH, touches, so a probe of radius up to GRID_REACH only tests the
// solids of its own cell. V34: box rotations are computed once here rather than on
// every probe (the cos/sin of the six Sahra doors were most of a bot's collision cost).
// Rebuilt when the map or its solid count changes; wider probes keep the full scan.
const GRID=2,GRID_REACH=1,NO_BOXES=[];let wallGrid=null;
function solidGrid(){
 const boxes=MAPS[ACTIVE_MAP].movementBoxes||NO_BOXES;
 if(wallGrid&&wallGrid.walls===WALLS&&wallGrid.count===WALLS.length&&wallGrid.boxes===boxes&&wallGrid.boxCount===boxes.length)return wallGrid;
 const cells=new Map(),cell=(cx,cz)=>{const k=cx*4096+cz;let c=cells.get(k);if(!c)cells.set(k,c={walls:[],boxes:[]});return c;};
 for(const w of WALLS)for(let cx=Math.floor((w[0]-w[2]/2-GRID_REACH)/GRID);cx<=Math.floor((w[0]+w[2]/2+GRID_REACH)/GRID);cx++)for(let cz=Math.floor((w[1]-w[3]/2-GRID_REACH)/GRID);cz<=Math.floor((w[1]+w[3]/2+GRID_REACH)/GRID);cz++)cell(cx,cz).walls.push(w);
 // The body meets a door leaf as its world-axis bounds, so it slides along the leaf the way it slides along a wall.
 // Bullets still test the rotated box (rayBox).
 const oriented=boxes.map(b=>{const c=Math.abs(Math.cos(b.yaw||0)),s=Math.abs(Math.sin(b.yaw||0));return {b,hx:c*b.w/2+s*b.d/2,hz:s*b.w/2+c*b.d/2};});
 for(const o of oriented){const hx=o.hx+GRID_REACH+.01,hz=o.hz+GRID_REACH+.01;
  for(let cx=Math.floor((o.b.x-hx)/GRID);cx<=Math.floor((o.b.x+hx)/GRID);cx++)for(let cz=Math.floor((o.b.z-hz)/GRID);cz<=Math.floor((o.b.z+hz)/GRID);cz++)cell(cx,cz).boxes.push(o);}
 wallGrid={walls:WALLS,count:WALLS.length,boxes,boxCount:boxes.length,cells,oriented};return wallGrid;
}
export function blocked(x,z,r=.4){
 if(Math.abs(x)>BOUNDS.x||Math.abs(z)>BOUNDS.z)return true;
 const grid=solidGrid(),near=r<=GRID_REACH,cell=near?grid.cells.get(Math.floor(x/GRID)*4096+Math.floor(z/GRID)):null;
 if(near&&!cell)return false;
 for(const w of near?cell.walls:WALLS)if(Math.abs(x-w[0])<w[2]/2+r&&Math.abs(z-w[1])<w[3]/2+r)return true;
 for(const o of near?cell.boxes:grid.oriented)if(Math.abs(x-o.b.x)<o.hx+r&&Math.abs(z-o.b.z)<o.hz+r)return true;
 return false;
}
export const groundHeight=(x,z)=>MAPS[ACTIVE_MAP].ground?.(x,z)||0;
// Running straight at a corner that catches only the edge of the hull: step round it instead of stopping dead.
const NUDGE=.14,NUDGE_STEP=.02,NUDGE_RATE=.06;
function nudge(p,legal,along,dx,dz){
 const toward=(along?dz:dx)||1;
 for(let off=NUDGE_STEP;off<=NUDGE+1e-9;off+=NUDGE_STEP)for(let n=0;n<2;n++){const sign=Math.sign(toward)*(n?-1:1),shift=Math.min(off,NUDGE_RATE,.8*Math.abs(along?dx:dz))*sign;
  if(along?legal(p.x+dx,p.z+off*sign)&&legal(p.x,p.z+off*sign)&&legal(p.x,p.z+shift):legal(p.x+off*sign,p.z+dz)&&legal(p.x+off*sign,p.z)&&legal(p.x+shift,p.z)){if(along)p.z+=shift;else p.x+=shift;return true;}}
 return false;
}
export const STEP_LIMIT=.32;
// True when the body stepped sideways round a corner: its velocity then stands, it was not stopped.
export function move(p,dx,dz){
 const before=groundHeight(p.x,p.z),wasGrounded=(p.y??before)-before<.055&&!(p.jumpV>0);
 const legal=(x,z)=>!blocked(x,z)&&groundHeight(x,z)-Math.max(p.y??before,groundHeight(p.x,p.z))<STEP_LIMIT;
 const freeX=legal(p.x+dx,p.z);if(freeX)p.x+=dx;const freeZ=legal(p.x,p.z+dz);if(freeZ)p.z+=dz;
 let nudged=false;
 if(!p.bot&&dx*dx+dz*dz>.000225&&freeX!==freeZ){if(!freeX&&Math.abs(dz)<.1*Math.abs(dx))nudged=nudge(p,legal,true,dx,dz);else if(!freeZ&&Math.abs(dx)<.1*Math.abs(dz))nudged=nudge(p,legal,false,dx,dz);}
 // A step down is walked; past a real drop gravity takes over. Bots have no jump step, so they stay on the ground.
 p.groundY=groundHeight(p.x,p.z);if(wasGrounded&&(p.bot||before-p.groundY<STEP_LIMIT))p.y=p.groundY;
 return nudged;
}
export function wallDistance(o,d,max=180){let nearest=max;const ox=o[0],oy=o[1],oz=o[2],dx=d[0],dy=d[1],dz=d[2],px=Math.abs(dx)<1e-8,py=Math.abs(dy)<1e-8,pz=Math.abs(dz)<1e-8;for(let i=0;i<WALLS.length;i++){const w=WALLS[i];let lo=0,hi=max;const hx=w[2]/2,x0=w[0]-hx,x1=w[0]+hx;if(px){if(ox<x0||ox>x1)continue;}else{const a=(x0-ox)/dx,b=(x1-ox)/dx;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}const y0=w[6]??0,y1=w[4];if(py){if(oy<y0||oy>y1)continue;}else{const a=(y0-oy)/dy,b=(y1-oy)/dy;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}const hz=w[3]/2,z0=w[1]-hz,z1=w[1]+hz;if(pz){if(oz<z0||oz>z1)continue;}else{const a=(z0-oz)/dz,b=(z1-oz)/dz;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}if(hi>=lo&&lo<nearest)nearest=lo}for(const a of ARCHES)nearest=Math.min(nearest,rayArch(o,d,a,nearest));for(const c of MAPS[ACTIVE_MAP].ballisticCylinders||[])nearest=Math.min(nearest,rayAxialCylinder(o,d,c,nearest));for(const b of MAPS[ACTIVE_MAP].ballisticBoxes||[])nearest=Math.min(nearest,rayBox(o,d,b,nearest));if(MAPS[ACTIVE_MAP].ground)nearest=Math.min(nearest,groundDistance(o,d,nearest));return nearest}
// Finite pressure-pipe cylinders along X, including both end caps.
export function rayAxialCylinder(o,d,c,max=180){
 const x=o[0]-c.x,y=o[1]-c.y,z=o[2]-c.z,half=c.length/2;let hit=max;
 if(Math.abs(x)<=half&&y*y+z*z<=c.radius*c.radius)return 0;
 const a=d[1]*d[1]+d[2]*d[2],b=y*d[1]+z*d[2],cc=y*y+z*z-c.radius*c.radius,disc=b*b-a*cc;
 if(a>1e-12&&disc>=0)for(const t of [(-b-Math.sqrt(disc))/a,(-b+Math.sqrt(disc))/a])if(t>=0&&t<hit&&Math.abs(x+d[0]*t)<=half)hit=t;
 if(Math.abs(d[0])>1e-12)for(const side of [-half,half]){const t=(side-x)/d[0];if(t>=0&&t<hit&&(y+d[1]*t)**2+(z+d[2]*t)**2<=c.radius*c.radius)hit=t;}return hit;
}
export function raySphere(o,d,c,r){const a=o.map((v,i)=>v-c[i]),b=a.reduce((s,v,i)=>s+v*d[i],0),q=b*b-a.reduce((s,v)=>s+v*v,0)+r*r;if(q<0)return Infinity;const s=Math.sqrt(q);return s-b<0?Infinity:Math.max(0,-b-s)}

export function rayBox(o,d,b,max=180){if(b.yaw){const c=Math.cos(b.yaw),s=Math.sin(b.yaw),x=o[0]-b.x,z=o[2]-b.z;return slabs(c*x-s*z,o[1]-b.y,s*x+c*z,c*d[0]-s*d[2],d[1],s*d[0]+c*d[2],0,0,0,b.w,b.h,b.d,max);}return slabs(o[0],o[1],o[2],d[0],d[1],d[2],b.x,b.y,b.z,b.w,b.h,b.d,max);}
// Runs on every ray of every frame: plain numbers, nothing allocated.
function slabs(ox,oy,oz,dx,dy,dz,cx,cy,cz,w,h,l,max){let lo=0,hi=max;
 const x0=cx-w/2,x1=cx+w/2;if(Math.abs(dx)<1e-9){if(ox<x0||ox>x1)return max;}else{const a=(x0-ox)/dx,b=(x1-ox)/dx;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
 const y0=cy-h/2,y1=cy+h/2;if(Math.abs(dy)<1e-9){if(oy<y0||oy>y1)return max;}else{const a=(y0-oy)/dy,b=(y1-oy)/dy;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
 const z0=cz-l/2,z1=cz+l/2;if(Math.abs(dz)<1e-9){if(oz<z0||oz>z1)return max;}else{const a=(z0-oz)/dz,b=(z1-oz)/dz;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
 return hi>=lo?lo:max;}

export function rayArch(o,d,a,max=180){
 const along=a.axis==='z'?2:0,across=a.axis==='z'?0:2,center=[a.x,0,a.z],low=[0,a.spring,0],high=[0,a.height,0];low[along]=center[along]-a.depth/2;high[along]=center[along]+a.depth/2;low[across]=center[across]-a.width/2;high[across]=center[across]+a.width/2;
 let lo=0,hi=max;for(let k=0;k<3;k++){if(Math.abs(d[k])<1e-8){if(o[k]<low[k]||o[k]>high[k])return max;}else{const t1=(low[k]-o[k])/d[k],t2=(high[k]-o[k])/d[k];lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}}if(hi<lo)return max;
 const oz=(o[across]-center[across])/(a.width/2),oy=(o[1]-a.spring)/a.rise,dz=d[across]/(a.width/2),dy=d[1]/a.rise,A=dz*dz+dy*dy,B=2*(oz*dz+oy*dy),C=oz*oz+oy*oy-1,f=A*lo*lo+B*lo+C;
 if(f>=-1e-8)return lo;if(A>1e-12){const disc=B*B-4*A*C;if(disc>=0){const exit=(-B+Math.sqrt(disc))/(2*A);if(exit>=lo&&exit<=hi)return exit;}}return max;
}

// V31 penetration. The solid struck at `entry` along the ray, with its material class
// and the distance at which the ray leaves it. Wood (crates, doors, timber) and sheet
// metal (containers, shutters) are penetrable up to a thickness; stone, plaster,
// concrete, the ground and the arches stop every round. Returns null when solid.
export const PENETRABLE={wood:{max:1.6,scale:.75,perMetre:.3},metal:{max:.55,scale:.55,perMetre:.5}};
function boxExit(o,d,mn,mx,from){let hi=Infinity;for(let a=0;a<3;a++){if(Math.abs(d[a])<1e-8)continue;const t1=(mn[a]-o[a])/d[a],t2=(mx[a]-o[a])/d[a];hi=Math.min(hi,Math.max(t1,t2));}return hi>from?hi:from;}
function wallMaterial(kind){return ACTIVE_MAP==='sahra'?([1,3,6].includes(kind)?'wood':[2,7].includes(kind)?'metal':'stone'):[1,2].includes(kind)?'metal':'stone';}
export function penetrationAt(o,d,entry){
 const probe=[o[0]+d[0]*(entry+.015),o[1]+d[1]*(entry+.015),o[2]+d[2]*(entry+.015)],map=MAPS[ACTIVE_MAP]||{};
 const inside=(mn,mx,p)=>p[0]>=mn[0]&&p[0]<=mx[0]&&p[1]>=mn[1]&&p[1]<=mx[1]&&p[2]>=mn[2]&&p[2]<=mx[2];
 const rotate=(p,b)=>{if(!b.yaw)return [p[0]-b.x,p[1]-(b.y??0),p[2]-b.z];const c=Math.cos(b.yaw),s=Math.sin(b.yaw),x=p[0]-b.x,z=p[2]-b.z;return [c*x-s*z,p[1]-(b.y??0),s*x+c*z];};
 const rotateDir=(v,b)=>{if(!b.yaw)return v;const c=Math.cos(b.yaw),s=Math.sin(b.yaw);return [c*v[0]-s*v[2],v[1],s*v[0]+c*v[2]];};
 let found=null;
 for(const w of WALLS){const mn=[w[0]-w[2]/2,w[6]??0,w[1]-w[3]/2],mx=[w[0]+w[2]/2,w[4],w[1]+w[3]/2];if(inside(mn,mx,probe)){found={material:wallMaterial(w[5]),exit:boxExit(o,d,mn,mx,entry)};break;}}
 if(!found)for(const b of map.movementBoxes||[]){const lp=rotate(probe,{...b,y:b.y??b.h/2}),mn=[-b.w/2,-b.h/2,-b.d/2],mx=[b.w/2,b.h/2,b.d/2];if(inside(mn,mx,lp)){const lo=rotate(o,{...b,y:b.y??b.h/2}),ld=rotateDir(d,b);found={material:'wood',exit:boxExit(lo,ld,mn,mx,entry)};break;}}
 if(!found)for(const b of map.ballisticBoxes||[]){const lp=rotate(probe,b),mn=[-b.w/2,-b.h/2,-b.d/2],mx=[b.w/2,b.h/2,b.d/2];if(inside(mn,mx,lp)){const lo=rotate(o,b),ld=rotateDir(d,b);found={material:/metal|copper|blue|iron/.test(b.material||'')?'metal':/wood/.test(b.material||'')?'wood':'stone',exit:boxExit(lo,ld,mn,mx,entry)};break;}}
 if(!found)return null;const rule=PENETRABLE[found.material];if(!rule)return null;
 const thickness=found.exit-entry;if(!(thickness>0)||thickness>rule.max)return null;
 return {material:found.material,exit:found.exit,thickness,scale:Math.max(.12,rule.scale-thickness*rule.perMetre)};
}
export function groundDistance(o,d,max=180){
 // Small ray steps followed by bisection keep steep ramps and pits solid.
 let prev=0;for(let t=.35;t<=max+.35;t+=.35){const at=Math.min(t,max),x=o[0]+d[0]*at,z=o[2]+d[2]*at;if(o[1]+d[1]*at<groundHeight(x,z)){
  let lo=prev,hi=at;for(let n=0;n<10;n++){const mid=(lo+hi)/2;if(o[1]+d[1]*mid<groundHeight(o[0]+d[0]*mid,o[2]+d[2]*mid))hi=mid;else lo=mid;}return hi;
 }prev=at;if(at===max)break;}return max;
}
