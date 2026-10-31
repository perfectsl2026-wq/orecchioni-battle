import {vehicleSolids} from './vehicles.js?v=38.1';
// CALDERA / 07, original Wingman station (V29): one bomb site, two lanes and a
// narrow mid portal. T land on the jetty (south), CT hold the station base (north).
// West lane: a covered warehouse onto the sea quay. East lane: the cliff belvedere,
// raised 1.2 m, then a ramp down to the site. Mid: gallery, courtyard and portal.
// Rectangles are WALKABLE spaces; their complement becomes station blocks, low sea
// walls on the open edges, and open water / crater views beyond them.
const clamp=t=>Math.max(0,Math.min(1,t));
export const CALDERA_WALK=[
 [-8,8,18,28,'MOLO'],[-16,-8,20,26,'USCITA OVEST'],[8,16,20,26,'USCITA EST'],[-6,-2,12,18,'GALLERIA'],[-8,6,0,12,'CORTE'],
 [-22,-12,4,26,'MAGAZZINO'],[-20,-14,2,4,'PORTONE'],[-24,-10,-12,2,'BANCHINA'],[-12,-8,4,8,'CUNICOLO'],
 [12,22,-2,26,'BELVEDERE'],[6,12,2,6,'SCALETTA'],[14,22,-12,-2,'RAMPA'],[12,20,-18,-12,'RAMPA'],
 [-10,12,-20,-6,'SITO A'],[0,6,-6,0,'PORTALE'],
 [-8,8,-32,-24,'BASE CT'],[-8,-4,-24,-20,'ACCESSO CT'],[4,8,-24,-20,'ACCESSO CT']
];
export const calderaWalkable=(x,z)=>CALDERA_WALK.some(r=>x>=r[0]&&x<=r[1]&&z>=r[2]&&z<=r[3]);
export const CALDERA_INTERIORS=[[-22,-12,4,26,'magazzino'],[-12,-8,4,8,'cunicolo'],[-6,-2,12,18,'galleria']];
export const calderaInterior=(x,z)=>CALDERA_INTERIORS.find(r=>x>=r[0]&&x<=r[1]&&z>=r[2]&&z<=r[3]);
// Open edges: a 1.1 m sea wall on the quay, the jetty and the belvedere; nothing
// solid beyond them, so the sea and the crater rim stay in view.
export const CALDERA_PARAPETS=[[-26,-24,-14,4],[-10,10,28,30],[22,24,-4,26]];
const VIEWS=[[-36,-26,-16,6],[-12,12,30,40],[24,36,-6,28]];
const inRect=(x,z,r)=>x>=r[0]&&x<=r[1]&&z>=r[2]&&z<=r[3];
export const CALDERA_STAIR_RUNS=[
 {id:'belvedere',axis:'z',x0:12,x1:22,z0:8,z1:14,low:1.2,rise:-1.2,count:6},
 {id:'scaletta',axis:'x',x0:6,x1:12,z0:2,z1:6,low:0,rise:1.2,count:6},
 {id:'ct-ovest',axis:'z',x0:-8,x1:-4,z0:-24,z1:-20,low:.8,rise:-.8,count:4},
 {id:'ct-est',axis:'z',x0:4,x1:8,z0:-24,z1:-20,low:.8,rise:-.8,count:4}
];
export const calderaStairAt=(x,z)=>CALDERA_STAIR_RUNS.find(s=>x>=s.x0&&x<s.x1&&z>=s.z0&&z<s.z1);
const tread=(t,n)=>Math.min(n-1,Math.floor(clamp(t)*n))/n;
export function calderaGround(x,z){
 const run=calderaStairAt(x,z);
 if(run){const t=run.axis==='z'?(z-run.z0)/(run.z1-run.z0):(x-run.x0)/(run.x1-run.x0);return run.low+run.rise*tread(t,run.count);}
 // Beyond the sea walls the shared floor is the water surface, so bullets and
 // grenades meet the drawn sea rather than an invisible quay.
 if(x<-26||x>24||z>30)return -1.25;
 if(inRect(x,z,[12,22,-2,8]))return 1.2;
 if(inRect(x,z,[14,22,-12,-2]))return 1.2*clamp((z+12)/10);
 if(inRect(x,z,[-8,8,-32,-24]))return .8;
 return 0;
}
const size=2,ox=-36,oz=-40,nx=36,nz=40,used=new Set(),walls=[];
const cellClass=(x,z)=>calderaWalkable(x,z)?null:VIEWS.some(r=>inRect(x,z,r))?'view':CALDERA_PARAPETS.some(r=>inRect(x,z,r))?'parapet':'block';
for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
 const key=ix+iz*nx,at=(i,j)=>cellClass(ox+(i+.5)*size,oz+(j+.5)*size),kind=at(ix,iz);if(used.has(key)||!kind||kind==='view')continue;
 let w=1;while(ix+w<nx&&!used.has(key+w)&&at(ix+w,iz)===kind)w++;
 let d=1;outer:while(iz+d<nz){for(let j=0;j<w;j++)if(used.has(ix+j+(iz+d)*nx)||at(ix+j,iz+d)!==kind)break outer;d++;}
 for(let a=0;a<d;a++)for(let b=0;b<w;b++)used.add(ix+b+(iz+a)*nx);
 walls.push(kind==='parapet'?[ox+(ix+w/2)*size,oz+(iz+d/2)*size,w*size,d*size,1.1,0,-1.4,'parapet']:[ox+(ix+w/2)*size,oz+(iz+d/2)*size,w*size,d*size,7.4+(walls.length%3)*1.2,0,-2]);
}
const footprint=(x,z,w,d)=>Math.min(calderaGround(x,z),...[-1,1].flatMap(a=>[-1,1].map(b=>calderaGround(x+a*w/2,z+b*d/2))));
// x, z, width, depth, height above local ground, kind, optional base, optional role.
// 1 instrument crate, 2 service vehicle, 4 bollard / pedestal, 5 low wall, 6 cargo pod, 7 steel column.
const COVER=[
 // Jetty: bollards on the edge, a pod pair the defenders cannot see past.
 ...[-7,7].map(x=>[x,27.2,.5,.5,.8,4]),[-4.6,20.6,2.4,1.6,1.4,6],[4.8,21,1.8,1.8,1.2,1],
 // Warehouse racks and a forklift-sized pod; quay bollards, a long container.
 [-19.4,22,1.6,3.6,2.2,6],[-14.6,15.6,1.6,3.2,1.6,1],[-19.2,9.6,2.2,2.2,1.4,1],[-15,6.4,1.6,1.6,1.2,6],
 [-21.2,-2.8,2.4,6,2.6,6],[-13.6,-9.4,1.8,1.8,1.3,1],[-16.4,.2,1.4,1.4,1.1,1],...[-4,-9].map(z=>[-23.2,z,.5,.5,.8,4]),
 // Courtyard: a closed pod breaks the gallery-to-portal line; the tide basin is low cover.
 [-1,6,2,2,1.8,6],[3.6,9.4,2.6,2.6,.75,5,undefined,'basin'],[-6.2,1.6,1.6,1.6,1.2,1],
 // Belvedere: telescope pedestals and benches along the sea wall.
 [19.6,20.6,.6,.6,1.1,4],[19.6,1.6,.6,.6,1.1,4],[15.2,4,2.6,1,.9,5],[20.6,-.6,1.6,1.6,1.3,1],[17.4,17,1.8,1.8,1.4,6],
 // Site: instrument pods, a parked survey truck and the field cabinet wall.
 [-6.2,-9.2,2.4,2.4,1.6,1],[8.6,-16.4,2,2,1.3,1],[-6.8,-17.4,2.8,1.4,1.2,6],[9.4,-8.8,1.6,2.6,1.4,6],[2.8,-8.4,3,1,1.05,5],[-2.6,-18.2,2.1,4.2,0,2],
 // CT base.
 [-5.6,-30.4,2.2,1.4,1.3,6],[5.8,-30.2,1.8,1.8,1.2,1]
];
const cover=COVER.map(([x,z,w,d,h,kind,low,role])=>{const y=calderaGround(x,z),base=kind===2?y+.195:low??footprint(x,z,w,d)-.03,top=kind===2?y+.745:y+h;return role?[x,z,w,d,top,kind,base,role]:[x,z,w,d,top,kind,base];});
const arch=(x,z,width,axis,{spring=2.8,rise=.45,height=5.2,depth=.7,doors=false,leaf}={})=>{const base=calderaGround(x,z);return {x,z,width,axis,base,spring:base+spring,rise,height:base+height,depth,doors,leaf};};
const ARCHES=[arch(3,-3,6,'z',{doors:true,spring:2.9,rise:.5,height:5.4}),arch(-17,3,6,'z',{spring:3.2,rise:.4,height:6.6,depth:.9}),arch(-10,6,4,'x',{spring:2.5,rise:.35,height:3.8}),arch(-4,17,4,'z',{spring:2.6,rise:.4,height:4.6}),arch(18,-10.8,8,'z',{spring:2.8,rise:.5,height:5.6})];
export const CALDERA={id:'caldera',title:'CALDERA / 07',short:'CALDERA',description:'Stazione costiera · un sito, magazzino e belvedere · Wingman 2v2',
 ground:calderaGround,bounds:{x:25.2,z:33.2},walls:[...walls,...cover],arches:ARCHES,
 spawns:{orange:[[-6,24],[-3,24],[0,24],[3,24],[6,24]],blue:[[-6,-28],[-3,-28],[0,-28],[3,-28],[6,-28]]},spawnYaw:{orange:0,blue:Math.PI},
 menuCamera:{position:[-18,3,-7],look:[-2,3.2,-20]},
 sites:[{id:'A',name:'TELEMETRIA',x:1,z:-13,radius:4,approaches:['banchina','portale','rampa'],routes:{banchina:[[-12,23],[-17,14],[-17,-2],[-12,-9]],portale:[[-4,15],[-4,9],[2,-1]],rampa:[[12,23],[15,19],[18,4],[18,-8],[16,-15]]},holds:[[-6,-12,-10,-9],[8,-11,12,-15],[1,-18,3,-6],[-4,-16,-10,-9]],watch:[[-10,-9],[3,-6],[12,-15]]}],
 labPoints:{MID:{x:-1,z:9},WEST:{x:-17,z:12},EAST:{x:17,z:0}},
 navAreas:[[0,24],[-12,23],[12,23],[-17,16],[-17,6],[-17,-4],[-12,-9],[-4,15],[-4,8],[3,-1.5],[17,20],[18.4,5],[18,-7],[16,-15],[1,-13],[-5,-14],[8,-12],[0,-28],[-6,-22],[6,-22]].map(([x,z])=>({x,z})),
 visits:{spawn:[0,24,0,'Molo · partenza T'],magazzino:[-17,18,0,'Magazzino coperto · corsia ovest'],banchina:[-18,-6,-Math.PI/2,'Banchina · ingresso ovest'],galleria:[-4,16,0,'Galleria · verso la corte'],
  corte:[-3,4,0,'Corte · centro'],portale:[3,-2,0,'Portale · porte sul sito'],belvedere:[15.4,21,0,'Belvedere · corsia est'],vista:[18,4,-Math.PI/2,'Belvedere · vista sulla caldera'],molo:[0,26,Math.PI,'Molo · vista sul mare'],rampa:[18,-4,0,'Rampa · discesa sul sito'],a:[1,-11,0,'Sito A · Telemetria'],ct:[0,-28,Math.PI,'Base CT']},
 ballisticBoxes:[],movementBoxes:[],ballisticCylinders:[],
 lobby:{kicker:'WINGMAN · 2 CONTRO 2',name:'CALDERA',code:'07',subtitle:'STAZIONE COSTIERA',lanes:'2 corsie + portale',tagline:'Stazione di ricerca sul bordo della caldera. Magazzino e banchina sul mare a ovest, belvedere a est, un portale stretto al centro.'},
 parapets:CALDERA_PARAPETS,interiors:CALDERA_INTERIORS,walk:CALDERA_WALK,pool:'wingman',utility:true
};
CALDERA.doors=ARCHES.map((a,index)=>({...a,index})).filter(a=>a.doors);
for(const a of CALDERA.doors){
 for(const side of [-1,1]){const across=side*(a.width/2-.2);CALDERA.walls.push([a.x+(a.axis==='z'?across:0),a.z+(a.axis==='x'?across:0),a.axis==='z'?.55:.65,a.axis==='x'?.55:.65,a.base+3.85,4,a.base]);}
 for(const side of [-1,1]){
  const w=a.leaf??(a.width===6?1.35:1.75),angle=.24,across=side*(a.width/2-.35-w/2*Math.cos(angle)),along=w/2*Math.sin(angle),axis=a.axis==='x'?Math.PI/2:0;
  const b={x:a.x+Math.cos(axis)*across+Math.sin(axis)*along,y:a.base+1.55,z:a.z-Math.sin(axis)*across+Math.cos(axis)*along,w,h:3.1,d:.18,yaw:axis+side*angle,render:false,door:a.index,side};
  CALDERA.movementBoxes.push(b);CALDERA.ballisticBoxes.push(b);
 }
}
for(const w of cover.filter(w=>w[5]===2)){const [x,z,width,depth]=w,solids=vehicleSolids(x,z,width,depth,calderaGround(x,z));CALDERA.ballisticBoxes.push(...solids.boxes);CALDERA.ballisticCylinders.push(...solids.cylinders);}
// Warehouse roof with two skylight slots; low roofs over the gallery and the tunnel.
const roof=(x0,x1,z0,z1,y,material='concrete')=>({x:(x0+x1)/2,y,z:(z0+z1)/2,w:x1-x0,h:.42,d:z1-z0,material});
CALDERA.ballisticBoxes.push(roof(-22,-12,4,10.5,6.4),roof(-22,-12,12.5,18.5,6.4),roof(-22,-12,20.5,26,6.4),roof(-12,-8,4,8,3.9),roof(-6,-2,12,18,4.6));
// Heliostat over the site: four steel columns are shared solids; the collector
// ring, stays and arches above 6 m are cosmetic like wires.
CALDERA.siteColumns=[[-8.6,-19.2],[10.6,-19.2],[-8.6,-6.8],[10.6,-6.8]].map(([x,z])=>({site:'A',x,z,w:.5,d:.5,top:7.2}));
for(const c of CALDERA.siteColumns)CALDERA.walls.push([c.x,c.z,c.w,c.d,c.top,7,calderaGround(c.x,c.z)]);
CALDERA.siteRoofs=[];
