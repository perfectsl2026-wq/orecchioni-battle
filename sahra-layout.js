import {sahraGround} from './sahra-terrain.js?v=38.2';
import {SAHRA_INFILL} from './sahra-infill.js?v=38.2';
import {vehicleSolids} from './vehicles.js?v=38.2';
// SAHRA / 13, original three-lane desert district (V29). T caravanserai south,
// CT plateau north. A lane: covered souk, colonnaded arcade, fountain court and
// ramp. Mid: a split-level piazza with a CT loggia and two links (A alley,
// B hammam). B lane: twisting alleys, a well court and a gated entry.
// Rectangles are WALKABLE spaces; their complement becomes shared solid blocks.
export const SAHRA_WALK=[
 [-12,12,32,46,'CARAVANSERRAGLIO'],[-22,-12,34,44,'USCITA OVEST'],[12,22,34,44,'USCITA EST'],[-4,4,12,32,'MERCATO'],
 [22,34,28,44,'SOUK'],[24,32,12,28,'ARCADE'],[22,42,-12,12,'FONTANA'],[30,38,-24,-12,'RAMPA A'],[22,44,-42,-24,'SITO A'],
 [-10,12,-10,12,'PIAZZA'],[6,12,-36,-10,'LOGGIA'],[12,18,-8,0,'PASSAGGIO A'],[14,20,-34,-8,'VICOLO A'],[20,22,-34,-28,'VICOLO A'],
 [-24,-10,-8,0,'HAMMAM'],[-24,-18,-38,-8,'CORRIDOIO B'],[-26,-24,-38,-32,'CORRIDOIO B'],
 [-34,-22,36,44,'VICOLI'],[-32,-26,14,36,'VICOLI'],[-42,-26,-8,14,'CORTE B'],[-34,-28,-22,-8,'PORTA B'],[-46,-26,-42,-22,'SITO B'],
 [-2,18,-50,-36,'CT'],[18,22,-42,-38,'CT A'],[-30,-2,-50,-44,'VIA CT'],[-30,-26,-44,-42,'VIA CT']
];
export const sahraWalkable=(x,z)=>SAHRA_WALK.some(r=>x>=r[0]&&x<=r[1]&&z>=r[2]&&z<=r[3]);
// Covered spaces: interior paving, warm practical lights and no posters.
export const SAHRA_INTERIORS=[[22,34,28,44,'souk'],[-24,-10,-8,0,'hammam'],[6,12,-22,-10,'loggia']];
export const sahraInterior=(x,z)=>SAHRA_INTERIORS.find(r=>x>=r[0]&&x<=r[1]&&z>=r[2]&&z<=r[3]);
// Roof heights by district: the hotel rises over A as its landmark, the kasbah walls
// stand tall around B, the souk and caravanserai stay low, the rest varies by lot.
function skyline(x,z,n){
 if(x>18&&z<-20)return x>30&&z<-30?13.4:11.8;
 if(x<-22&&z<-18)return 10.4;
 if(x>18&&z>8)return n%2?7.2:7.8;
 if(z>30)return n%2?7.6:8.4;
 if(z<-34)return 9.8;
 return [8.2,9.4,10.6,8.8][n%4];
}
const size=2,nx=60,nz=66,used=new Set(),walls=[];
for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
 const key=ix+iz*nx;if(used.has(key)||sahraWalkable(-60+(ix+.5)*size,-66+(iz+.5)*size))continue;
 let w=1;while(ix+w<nx&&!used.has(key+w)&&!sahraWalkable(-60+(ix+w+.5)*size,-66+(iz+.5)*size))w++;
 let d=1;outer:while(iz+d<nz){for(let j=0;j<w;j++)if(used.has(ix+j+(iz+d)*nx)||sahraWalkable(-60+(ix+j+.5)*size,-66+(iz+d+.5)*size))break outer;d++;}
 for(let a=0;a<d;a++)for(let b=0;b<w;b++)used.add(ix+b+(iz+a)*nx);
 const cx=-60+(ix+w/2)*size,cz=-66+(iz+d/2)*size;walls.push([cx,cz,w*size,d*size,skyline(cx,cz,walls.length),0,-2]);
}
const footprint=(x,z,w,d)=>Math.min(sahraGround(x,z),...[-1,1].flatMap(a=>[-1,1].map(b=>sahraGround(x+a*w/2,z+b*d/2))));
// Deliberate combat cover: x, z, width, depth, height above local ground, kind,
// an optional base (walls that also close a level change start at the floor) and
// an optional render role (basin, well, rill, planter, spout, trunk) for authored models.
// 1 crate, 2 vehicle, 3 timber cart, 4 stone pier, 5 low stone wall, 6 metal crate.
// A planter with a tree: the trunk is a shared solid up to the cosmetic canopy.
const tree=(x,z,size=1.6,h=.7)=>{const top=sahraGround(x,z)+h;return [[x,z,size,size,h,5,undefined,'planter'],[x,z,.32,.32,h+2.1,4,top,'trunk']];};
const COVER=[
 // A site: default stack, ramp planter, link crate, service van; plant centre stays open.
 [38.4,-29.6,2.4,2.4,1.9,1],[34,-26.2,4.2,1.2,1.05,5],[25.2,-36,2,2,1.3,1],[41.6,-37.4,2.1,4.4,0,2],[28.4,-40.2,2.6,1.6,1.15,6],
 // Fountain court: stone basin and spout break the arcade-to-ramp sightline.
 [32,-.2,4.4,4.4,.9,5,undefined,'basin'],[32,-.2,.9,.9,2.3,4,undefined,'spout'],...tree(24.6,10.2),...tree(40,-10.6),[25,-8.4,2,2,1.35,1],[39.6,7.4,2.2,2.2,1.5,1],[39.8,-7.8,1.6,2.8,1.25,3],
 // Colonnaded arcade (east side) and souk stalls.
 ...[14.5,19.5,24.5].map(z=>[31.2,z,.7,.7,4.1,4]),[24.6,32.6,1.8,3,1.3,3],[31.6,38.8,1.8,3,1.3,3],[28,43,3,1.4,1.5,1],
 // Market stalls zigzag up mid; piazza kiosk and upper planter.
 [-2.4,26.4,2.2,3,1.35,3],[2.4,19.6,2.2,3,1.35,3],[6.6,8.2,2.4,2.4,2.2,6],[-1,2.5,1.2,7,.9,5,undefined,'rill'],[-4.4,-5.4,4.6,1.2,1,5,undefined,'planter'],[-5.8,-5.4,.32,.32,3.1,4,1.8,'trunk'],[-3,-5.4,.32,.32,3.1,4,1.8,'trunk'],...tree(-8.4,10.4),...tree(10.4,10.4),[9.4,-6.2,1.6,1.6,1.2,1],
 // Hammam pier, B corridor crates, alley jars.
 [-19,-4,1.1,1.1,4,4],[-19,-19.8,1.6,1.6,1.3,1],[-22.4,-30.4,1.6,2,1.3,1],[16.4,-15,1.6,1.6,1.3,1],
 // Well court: a closed sabil kiosk breaks the alleys-to-gate line; the well and
 // the cart are low cover on either side of it.
 [-30,-2,3,3,3.4,8],[-38,1,3,3,1,5,undefined,'well'],[-27.4,4.6,1.6,2.6,1.4,3],[-39.4,9.6,2,2,1.4,1],[-29,30,1.6,1.6,1.2,1],
 // B site: gate planter, entry stack, kasbah cart.
 [-31,-25,3.2,1.4,1.1,5],[-28,-36.6,2.2,2.2,1.8,1],[-43.4,-25.6,2,3,1.25,3],[-32.6,-40.6,2.4,1.4,1.2,6],
 // B terrace parapets and the stair balustrade: real low walls, never a ledge.
 [-43,-32.2,6,.4,1,5,-.03],[-40.2,-33.1,.4,1.8,1,5,-.03],[-37,-34.2,6,.4,1.6,5],
 // Spawns and the CT walk.
 [-8,44.2,3,1.4,1.4,1],[9.6,34.4,2,2,1.2,1],[-1.5,35.6,2.6,1.6,1.3,3],...tree(10.6,44.6),...tree(-10.6,33.6),...tree(16.6,-48.6),[-14,-47,2,2,1.3,1],[1,-38.4,2.4,1.4,1.2,6],[9,-39.4,3,1,1,5],[14.6,-38.7,2.1,4.4,0,2]
];
const cover=COVER.map(([x,z,w,d,h,kind,low,role])=>{const y=sahraGround(x,z),base=kind===2?y+.195:low??footprint(x,z,w,d)-.03,top=kind===2?y+.745:y+h;return role?[x,z,w,d,top,kind,base,role]:[x,z,w,d,top,kind,base];});
// Arches carry absolute springing and crown heights from the floor they span.
const arch=(x,z,width,axis,{spring=2.6,rise=1,height=6,depth=.7,doors=false}={})=>{const base=sahraGround(x,z);return {x,z,width,axis,base,spring:base+spring,rise,height:base+height,depth,doors};};
const ARCHES=[
 arch(-31,-15,6,'z',{doors:true,height:6.2}),arch(21,-31,6,'x',{doors:true}),arch(-16,-4,8,'x',{doors:true,rise:1.2,height:5.6}),
 arch(28,27,8,'z',{rise:1.4,height:6.4}),arch(34,-22.6,8,'z',{spring:2.8,rise:1.6,height:7.2,depth:.9}),arch(0,13,8,'z',{rise:1.2}),
 arch(9,-11,6,'z'),arch(13,-4,8,'x'),arch(-29,15,6,'z'),arch(-25,-35,6,'x'),arch(20,-40,4,'x',{spring:2.4,rise:.8,height:5.4}),arch(-28,-43,4,'z',{spring:2.4,rise:.8,height:5.4})
];
export const SAHRA={id:'sahra',title:'SAHRA / 13',short:'SAHRA',description:'Distretto del deserto · Minaret A / Riwaq B · souk, piazza, vicoli · competitiva 5v5',
 ground:sahraGround,bounds:{x:47.2,z:51.2},walls:[...walls,...cover],arches:ARCHES,
 spawns:{orange:[[-8,40],[-4,40],[0,40],[4,40],[8,40]],blue:[[0,-44],[4,-44],[8,-44],[12,-44],[16,-44]]},spawnYaw:{orange:0,blue:Math.PI},
 menuCamera:{position:[30,2.3,10],look:[33,5,-34]},
 // Bot routes per T approach (waypoints in order) and defender holds per site:
 // x, z and the entrance each hold watches.
 sites:[{id:'A',name:'MINARET',x:33,z:-34,radius:4.5,approaches:['ramp','link','ct'],routes:{ramp:[[17,39],[28,36],[28,20],[30,4],[34,-16]],link:[[0,24],[2,6],[15,-4],[17,-18],[21,-31]]},holds:[[38,-33,34,-24],[26,-38,21,-31],[39.5,-41,34,-24],[30,-30,21,-31]],watch:[[34,-24],[21,-31]]},
  {id:'B',name:'RIWAQ',x:-31,z:-29,radius:4.5,approaches:['gate','hammam','ct'],routes:{gate:[[-17,39],[-29,30],[-30,10],[-34,4],[-31,-10]],hammam:[[0,24],[2,6],[-12.5,-4],[-21,-14],[-21,-32],[-25,-35]]},holds:[[-43,-36,-31,-22],[-28,-40,-25,-35],[-36,-27,-31,-22],[-27.5,-24,-25,-35]],watch:[[-31,-22],[-25,-35]]}],
 labPoints:{MID:{x:1,z:2},SOUK:{x:30,z:20},FONT:{x:32,z:-6},LINK:{x:17,z:-14},CORTE:{x:-31,z:-3},HAM:{x:-18,z:-4}},
 navAreas:[[0,40],[-17,39],[17,39],[28,36],[28,20],[27,4],[37,-4],[34,-18],[33,-34],[26,-30],[40,-40],[0,24],[2,6],[2,-6],[9,-18],[9,-30],[15,-4],[17,-20],[-17,-4],[-21,-16],[-21,-32],
  [-28,40],[-29,25],[-36,4],[-31,-12],[-31,-29],[-43,-36],[-28,-40],[8,-44],[20,-40],[-16,-47]].map(([x,z])=>({x,z})),
 ballisticBoxes:[],movementBoxes:[],ballisticCylinders:[],
 // Visit-mode viewpoints: x, z, yaw (0 faces north, towards CT).
 visits:{spawn:[0,40,0,'Partenza T · caravanserraglio'],mercato:[0,26,0,'Mercato · verso la piazza'],souk:[28,38,0,'Souk coperto · corsia A'],arcade:[28,22,0,'Arcata · colonne'],
  fontana:[30,8,0,'Corte della fontana · ingresso A'],rampa:[34,-14,0,'Rampa A · verso il sito'],a:[33,-28,0,'Sito A · Minaret'],piazza:[1,8,0,'Piazza · due livelli'],
  loggia:[9,-32,Math.PI,'Loggia CT · sopra la piazza'],passaggio:[14,-4,-Math.PI/2,'Passaggio A · dal centro'],vicolo:[17,-12,0,'Vicolo A · scale'],hammam:[-12.5,-4,Math.PI/2,'Hammam · verso B'],
  corridoio:[-21,-12,0,'Corridoio B'],vicoli:[-29,26,0,'Vicoli · corsia B'],corte:[-34,9,0,'Corte del pozzo · ingresso B'],porta:[-31,-12,0,'Porta B · battenti'],b:[-28,-27,0,'Sito B · Riwaq'],ct:[8,-44,Math.PI,'Partenza CT']},

 lobby:{kicker:'COMPETITIVA · 5 CONTRO 5',name:'SAHRA',code:'13',subtitle:'DISTRETTO DEL DESERTO',lanes:'3 corsie',tagline:'Distretto del deserto. Souk coperto e corte della fontana verso A, piazza su due livelli al centro, vicoli e hammam verso B.'},
 interiors:SAHRA_INTERIORS,walk:SAHRA_WALK
};
// Open, angled double leaves. The same oriented boxes drive mesh, walking and shots.
SAHRA.doors=ARCHES.map((a,index)=>({...a,index})).filter(a=>a.doors);
for(const a of SAHRA.doors){
 for(const side of [-1,1]){const across=side*(a.width/2-.2);SAHRA.walls.push([a.x+(a.axis==='z'?across:0),a.z+(a.axis==='x'?across:0),a.axis==='z'?.55:.65,a.axis==='x'?.55:.65,a.base+3.85,4,a.base]);}
 for(const side of [-1,1]){
  const w=a.width===6?1.35:1.75,angle=.24,across=side*(a.width/2-.35-w/2*Math.cos(angle)),along=w/2*Math.sin(angle),axis=a.axis==='x'?Math.PI/2:0;
  const b={x:a.x+Math.cos(axis)*across+Math.sin(axis)*along,y:a.base+1.55,z:a.z-Math.sin(axis)*across+Math.cos(axis)*along,w,h:3.1,d:.18,yaw:axis+side*angle,render:false,door:a.index,side};
  SAHRA.movementBoxes.push(b);SAHRA.ballisticBoxes.push(b);
 }
}
// Vehicle greenhouse, underbody and wheels keep shots consistent with the model.
for(const w of cover.filter(w=>w[5]===2)){const [x,z,width,depth]=w,solids=vehicleSolids(x,z,width,depth,sahraGround(x,z));SAHRA.ballisticBoxes.push(...solids.boxes);SAHRA.ballisticCylinders.push(...solids.cylinders);}
// Roofs over the covered souk, hammam and loggia. Slots between slabs are
// skylights; every slab is a shared ballistic solid drawn with the same box.
const roof=(x0,x1,z0,z1,y,material='stone')=>({x:(x0+x1)/2,y,z:(z0+z1)/2,w:x1-x0,h:.42,d:z1-z0,material});
SAHRA.ballisticBoxes.push(
 roof(22,34,28,33,5.2),roof(22,34,35,39.5,5.2),roof(22,34,41.5,44,5.2),
 roof(-24,-17,-8,0,4.6),roof(-15,-10,-8,0,4.6),
 roof(6,12,-22,-16.5,4.8+.8),roof(6,12,-15,-10,4.8+.8)
);
SAHRA.infill=SAHRA_INFILL.map(spec=>{
 const [x,z,w,d,h,kind]=spec.shape,base=footprint(x,z,w,d)-.03;
 const solid=[x,z,w,d,sahraGround(x,z)+h,kind,base];SAHRA.walls.push(solid);return {...spec,solid};
});
// Site pavilions are authored physical architecture: columns are shared
// movement / shot solids, the cantilevers real ballistic roofs above jump height.
SAHRA.siteColumns=[
 {site:'A',x:27,z:-37.8,w:.42,d:.62,top:7.2},{site:'A',x:39,z:-37.8,w:.42,d:.62,top:7.2},
 {site:'B',x:-40.3,z:-39.4,w:.5,d:.65,top:5.6},{site:'B',x:-40.3,z:-32.6,w:.5,d:.65,top:5.6}
];
for(const c of SAHRA.siteColumns)SAHRA.walls.push([c.x,c.z,c.w,c.d,c.top,7,sahraGround(c.x,c.z)]);
SAHRA.siteRoofs=[
 {site:'A',x:27.6,y:6.95,z:-39.9,w:7.6,h:.42,d:4.6,material:'siteIvory'},
 {site:'A',x:38.4,y:6.95,z:-39.9,w:7.6,h:.42,d:4.6,material:'siteIvory'},
 {site:'A',x:33,y:7.22,z:-41.72,w:18,h:.16,d:.5,material:'copper'},
 {site:'A',x:33,y:7.18,z:-37.7,w:18,h:.12,d:.36,material:'copper'},
 {site:'A',x:33,y:6.98,z:-39.8,w:3.2,h:.16,d:.2,material:'metal'},
 {site:'B',x:-43.2,y:5.45,z:-36,w:6.2,h:.42,d:8.6,material:'blue'},
 {site:'B',x:-40.15,y:5.74,z:-36,w:.35,h:.12,d:8.8,material:'copper'}
];
SAHRA.ballisticBoxes.push(...SAHRA.siteRoofs);
