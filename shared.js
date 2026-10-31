import {SAHRA} from './sahra-layout.js?v=38.1';
import {CALDERA} from './caldera-layout.js?v=38.1';
export const WEAPONS=[{name:'P226',label:'PISTOLA',mag:12,damage:28,rate:.23,reload:1.25,spread:.007,range:90,auto:false,color:0x303e42},{name:'MP5',label:'MITRA',mag:30,damage:19,rate:.075,reload:1.7,spread:.026,range:65,auto:true,color:0x253436},{name:'AK-47',label:'ASSALTO',mag:30,damage:34,rate:.115,reload:2.2,spread:.014,range:120,auto:true,color:0x7c5235},{name:'M4A1',label:'ASSALTO',mag:30,damage:27,rate:.09,reload:1.95,spread:.009,range:120,auto:true,color:0x334444},{name:'M24',label:'PRECISIONE',mag:5,damage:115,rate:1.2,reload:2.8,spread:.018,aimSpread:.00025,range:180,auto:false,color:0x53614c},{name:'K-07',label:'COLTELLO',mag:0,damage:35,rate:.42,reload:0,range:1.85,auto:true,melee:true,color:0x7c9492}];
// x,z,width,depth,height,material. All walls are shared by rendering, collision and hitscan.
export const MAX_PLAYERS=10;
export {teamFor as chooseTeam} from './roster.js?v=38.1';
export const MAPS={sahra:SAHRA,caldera:CALDERA};
// FORGE / 11: compact symmetric warm-up arena for deathmatch.
const FORGE_ARCHES=[{x:-8,z:0,width:5,spring:2,rise:1.4,height:4.4,depth:1.2},{x:8,z:0,width:5,spring:2,rise:1.4,height:4.4,depth:1.2}];
MAPS.forge={id:'forge',title:'FORGE / 11',menuCamera:{position:[-14,2.4,-2],look:[10,3.5,2]},short:'FORGE',description:'Centrale alpina · calcestruzzo chiaro, rame e turbine monumentali',bounds:{x:17.3,z:19.3},
 walls:[[-18,0,1,41,7,0],[18,0,1,41,7,0],[0,-20,37,1,7,0],[0,20,37,1,7,0],[-12,-12,6,9,7.4,0],[12,-12,6,9,7.4,0],[-12,12,6,9,7.4,0],[12,12,6,9,7.4,0],[-8,-4.5,1.2,4,4.4,0],[-8,4.5,1.2,4,4.4,0],[8,-4.5,1.2,4,4.4,0],[8,4.5,1.2,4,4.4,0],[0,0,5.4,3.4,1.15,3],[0,0,.8,.8,2.1,4],[-4.8,-5,2.5,1.8,2.05,1],[4.8,5,2.5,1.8,2.05,1],[-3,-12.4,3.2,1.2,1.8,2],[3,12.4,3.2,1.2,1.8,2]],arches:FORGE_ARCHES,spawns:{blue:[[-3,-17.8],[3,-17.8],[-6,-18]],orange:[[3,17.8],[-3,17.8],[6,18]]}};
MAPS.forge.ballisticCylinders=[{x:0,y:6.2,z:0,radius:.82,length:14},...[-6,-3,0,3,6].map(x=>({x,y:6.2,z:0,radius:1.02,length:.16}))];
// V29 curated pool: SAHRA is the 5v5 competitive map (two sites), CALDERA the
// Wingman map (one site, 2v2 or 3v3, CS2 Wingman timings), FORGE the warm-up arena.
Object.assign(MAPS.sahra,{pool:'competitive',utility:true,modes:['demolition','deathmatch']});
Object.assign(MAPS.caldera,{pool:'wingman',utility:true,modes:['demolition','deathmatch'],rules:{demolition:{target:9,roundMs:90000}}});
Object.assign(MAPS.forge,{pool:'arena',modes:['deathmatch'],lobby:{kicker:'ARENA · RISCALDAMENTO',name:'FORGE',code:'11',subtitle:'CENTRALE ALPINA',lanes:'arena simmetrica',tagline:'Centrale alpina compatta per scaldare la mira prima delle partite: deathmatch a squadre con rientro immediato.'}});
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
 // A box's grown footprint in world axes is bounded by its rotated half extents.
 const oriented=boxes.map(b=>({b,c:Math.cos(b.yaw||0),s:Math.sin(b.yaw||0)}));
 for(const o of oriented){const a=o.b.w/2+GRID_REACH,e=o.b.d/2+GRID_REACH,hx=Math.abs(o.c)*a+Math.abs(o.s)*e+.01,hz=Math.abs(o.s)*a+Math.abs(o.c)*e+.01;
  for(let cx=Math.floor((o.b.x-hx)/GRID);cx<=Math.floor((o.b.x+hx)/GRID);cx++)for(let cz=Math.floor((o.b.z-hz)/GRID);cz<=Math.floor((o.b.z+hz)/GRID);cz++)cell(cx,cz).boxes.push(o);}
 wallGrid={walls:WALLS,count:WALLS.length,boxes,boxCount:boxes.length,cells,oriented};return wallGrid;
}
export function blocked(x,z,r=.4){
 if(Math.abs(x)>BOUNDS.x||Math.abs(z)>BOUNDS.z)return true;
 const grid=solidGrid(),near=r<=GRID_REACH,cell=near?grid.cells.get(Math.floor(x/GRID)*4096+Math.floor(z/GRID)):null;
 if(near&&!cell)return false;
 for(const w of near?cell.walls:WALLS)if(Math.abs(x-w[0])<w[2]/2+r&&Math.abs(z-w[1])<w[3]/2+r)return true;
 for(const o of near?cell.boxes:grid.oriented){const b=o.b,dx=x-b.x,dz=z-b.z;if(Math.abs(o.c*dx-o.s*dz)<b.w/2+r&&Math.abs(o.s*dx+o.c*dz)<b.d/2+r)return true;}
 return false;
}
export const groundHeight=(x,z)=>MAPS[ACTIVE_MAP].ground?.(x,z)||0;
export function move(p,dx,dz){
 const before=groundHeight(p.x,p.z),wasGrounded=(p.y??before)-before<.055&&!(p.jumpV>0);
 const legal=(x,z)=>!blocked(x,z)&&groundHeight(x,z)-Math.max(p.y??before,groundHeight(p.x,p.z))<.32;
 if(legal(p.x+dx,p.z))p.x+=dx;if(legal(p.x,p.z+dz))p.z+=dz;
 p.groundY=groundHeight(p.x,p.z);if(wasGrounded)p.y=p.groundY;
}
export function wallDistance(o,d,max=180){let nearest=max;for(const w of WALLS){let lo=0,hi=max;const mins=[w[0]-w[2]/2,w[6]??0,w[1]-w[3]/2],maxs=[w[0]+w[2]/2,w[4],w[1]+w[3]/2];for(let a=0;a<3;a++){if(Math.abs(d[a])<1e-8){if(o[a]<mins[a]||o[a]>maxs[a]){hi=-1;break}}else{let t1=(mins[a]-o[a])/d[a],t2=(maxs[a]-o[a])/d[a];lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2))}}if(hi>=lo&&lo<nearest)nearest=lo}for(const a of ARCHES)nearest=Math.min(nearest,rayArch(o,d,a,nearest));for(const c of MAPS[ACTIVE_MAP].ballisticCylinders||[])nearest=Math.min(nearest,rayAxialCylinder(o,d,c,nearest));for(const b of MAPS[ACTIVE_MAP].ballisticBoxes||[])nearest=Math.min(nearest,rayBox(o,d,b,nearest));if(MAPS[ACTIVE_MAP].ground)nearest=Math.min(nearest,groundDistance(o,d,nearest));return nearest}
// Finite pressure-pipe cylinders along X, including both end caps.
export function rayAxialCylinder(o,d,c,max=180){
 const x=o[0]-c.x,y=o[1]-c.y,z=o[2]-c.z,half=c.length/2;let hit=max;
 if(Math.abs(x)<=half&&y*y+z*z<=c.radius*c.radius)return 0;
 const a=d[1]*d[1]+d[2]*d[2],b=y*d[1]+z*d[2],cc=y*y+z*z-c.radius*c.radius,disc=b*b-a*cc;
 if(a>1e-12&&disc>=0)for(const t of [(-b-Math.sqrt(disc))/a,(-b+Math.sqrt(disc))/a])if(t>=0&&t<hit&&Math.abs(x+d[0]*t)<=half)hit=t;
 if(Math.abs(d[0])>1e-12)for(const side of [-half,half]){const t=(side-x)/d[0];if(t>=0&&t<hit&&(y+d[1]*t)**2+(z+d[2]*t)**2<=c.radius*c.radius)hit=t;}return hit;
}
export function raySphere(o,d,c,r){const a=o.map((v,i)=>v-c[i]),b=a.reduce((s,v,i)=>s+v*d[i],0),q=b*b-a.reduce((s,v)=>s+v*v,0)+r*r;return q<0?Infinity:Math.max(0,-b-Math.sqrt(q))}

export function rayBox(o,d,b,max=180){if(b.yaw){const c=Math.cos(b.yaw),s=Math.sin(b.yaw),x=o[0]-b.x,z=o[2]-b.z;return rayBox([c*x-s*z,o[1]-b.y,s*x+c*z],[c*d[0]-s*d[2],d[1],s*d[0]+c*d[2]],{x:0,y:0,z:0,w:b.w,h:b.h,d:b.d},max);}let lo=0,hi=max;const c=[b.x,b.y,b.z],size=[b.w,b.h,b.d];for(let i=0;i<3;i++){const low=c[i]-size[i]/2,high=c[i]+size[i]/2;if(Math.abs(d[i])<1e-9){if(o[i]<low||o[i]>high)return max;}else{const a=(low-o[i])/d[i],z=(high-o[i])/d[i];lo=Math.max(lo,Math.min(a,z));hi=Math.min(hi,Math.max(a,z));}}return hi>=lo?lo:max;}

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
