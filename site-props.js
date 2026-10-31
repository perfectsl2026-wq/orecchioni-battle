import * as T from './vendor/three.module.js';
import {box,cyl,cable,label} from './graphics.js?v=38.2';
import {metricBlock as block} from './caldera-architecture.js?v=38.2';
import {cosmetic} from './trim-kit.js?v=38.2';
import {MAPS} from './shared.js?v=38.2';
// Hero props after the Riot practice: a small dedicated set per site that names the
// place at a glance (minaret and hotel for A, kasbah market for B, telemetry for the
// Caldera site). Everything sits on unreachable roofs, outside the boundary, above
// head height or flush on authoritative walls, so it never reads as cover; like the
// wires and palms it is cosmetic for ballistics.
const flag=m=>{m.userData.nonBallistic=true;return m;};
const std=o=>flag(new T.MeshStandardMaterial(o));
const UP=new T.Vector3(0,1,0);
function hash(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function dataTexture(data,w,h,{srgb=true,repeat=null}={}){
 const t=new T.DataTexture(data,w,h);if(srgb)t.colorSpace=T.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=8;
 if(repeat){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);}t.needsUpdate=true;return t;
}
// Pierced brass of a Moroccan lantern: eight-point stars glow, the metal does not.
function piercedTextures(){
 const S=64,albedo=new Uint8Array(S*S*4),mask=new Uint8Array(S*S*4);
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){
  const cx=(x%16)-7.5,cy=(y%16)-7.5,hole=Math.max(Math.abs(cx),Math.abs(cy))<3.2||Math.abs(cx)+Math.abs(cy)<4.6,i=(y*S+x)*4;
  albedo.set(hole?[244,214,164,255]:[176,134,78,255],i);mask.set(hole?[255,255,255,255]:[0,0,0,255],i);
 }
 return {map:dataTexture(albedo,S,S,{repeat:[4,2]}),emissiveMap:dataTexture(mask,S,S,{repeat:[4,2]})};
}
// Four flat-woven kilims in one atlas: lozenge medallions, zigzag borders, fringes.
function rugTexture(){
 const W=128,H=256,N=4,data=new Uint8Array(W*N*H*4);
 const palettes=[
  {field:[148,48,36],motif:[40,56,92],accent:[208,154,70],light:[228,212,178],dark:[54,36,30]},
  {field:[42,60,94],motif:[158,54,40],accent:[214,168,78],light:[230,216,184],dark:[30,30,40]},
  {field:[194,140,64],motif:[128,42,34],accent:[58,46,38],light:[234,218,182],dark:[72,42,30]},
  {field:[112,38,42],motif:[212,168,92],accent:[48,84,86],light:[226,208,172],dark:[42,28,28]}];
 for(let k=0;k<N;k++){const c=palettes[k];for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const u=(x+.5)/W,v=(y+.5)/H,i=(y*W*N+k*W+x)*4;let col=c.field,a=255;
  if(v<.045||v>.955){const len=.03+.015*hash(x,k*7),edge=v<.045?.045-v:v-.955;a=Math.sin(u*W*1.7)>-.25&&edge<len?255:0;col=c.light;}
  else{
   const bx=Math.min(u,1-u),by=Math.min(v-.045,.955-v);
   if(bx<.035||by<.025)col=c.dark;
   else if(bx<.1||by<.07){const t=bx<.1?v*24:u*12,zig=Math.abs(t%1-.5)*2,d=bx<.1?Math.abs(bx-.067):Math.abs(by-.047);col=d<.016*zig+.006?c.accent:c.light;}
   else{
    let d=9;for(const q of [.29,.5,.71])d=Math.min(d,Math.abs(u-.5)*1.3+Math.abs(v-q)*2.1);
    if(d<.075)col=c.accent;else if(d<.11)col=c.light;else if(d<.16)col=c.motif;else if(d<.18)col=c.dark;
    else if(Math.abs((v*15)%1-.5)<.05)col=c.motif;
    else if(Math.abs(u-.5)>.24&&Math.abs((v*7.5+.25)%1-.5)<.12&&Math.abs((u*9)%1-.5)<.18)col=c.accent;
   }
  }
  // Sun fade and soiling, plus the weave grain of the wool.
  const fade=.82+.18*noise(u*4+k*9,v*6)-.06*hash(x,y)-(v<.3?.08*noise(u*9,v*9):0);
  data.set([col[0]*fade,col[1]*fade,col[2]*fade,a].map(n=>Math.max(0,Math.min(255,Math.round(n)))),i);
 }}
 return dataTexture(data,W*N,H);
}
function propKit(){
 const pierced=piercedTextures();
 return {
  brass:std({color:0xb98d52,roughness:.34,metalness:.85}),
  iron:std({color:0x2d3335,roughness:.62,metalness:.55}),
  glow:std({color:0xffffff,map:pierced.map,emissive:0xffa24c,emissiveMap:pierced.emissiveMap,emissiveIntensity:2.4,roughness:.42,metalness:.5}),
  bulb:std({color:0xfff2d6,emissive:0xffcf8a,emissiveIntensity:1.8,roughness:.4}),
  beacon:std({color:0xd8473a,emissive:0xff3a26,emissiveIntensity:2,roughness:.4}),
  led:std({color:0x7fd6a2,emissive:0x3fe08a,emissiveIntensity:1.6,roughness:.4}),
  enamel:std({color:0xe4e0d4,roughness:.48,metalness:.3}),
  grille:std({color:0x394240,roughness:.72,metalness:.45}),
  dish:std({color:0xe9e6dd,roughness:.42,metalness:.2,side:T.DoubleSide}),
  tank:std({color:0xdad7cc,roughness:.55,metalness:.25}),
  tile:std({color:0x2b6a64,roughness:.26,metalness:.05}),
  shadow:std({color:0x2b2621,roughness:.95}),
  rug:std({map:rugTexture(),alphaTest:.5,roughness:1})
 };
}
function rod(parent,material,a,b,r=.02,segments=6){
 const A=new T.Vector3(...a),d=new T.Vector3(...b).sub(A),length=d.length(),m=new T.Mesh(new T.CylinderGeometry(r,r,length,segments,1,true),material);
 m.position.copy(A).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(UP,d.normalize());m.castShadow=r>.03;m.receiveShadow=true;parent.add(m);return m;
}
function group(parent,x,y,z,yaw=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;parent.add(g);return g;}

// --- Rooftop kit: the skyline clutter of a lived-in desert town. ---
function waterTank(parent,k,x,y,z,{r=.55,h=1.15,stand=.75}={}){
 for(const [a,b]of [[-1,-1],[1,-1],[-1,1],[1,1]])box(parent,k.iron,x+a*r*.62,y+stand/2,z+b*r*.62,.05,stand,.05);
 box(parent,k.iron,x,y+stand+.02,z,r*1.6,.04,r*1.6);const base=y+stand+.04;
 cyl(parent,k.tank,x,base+h/2,z,r,h,'y',r,14);cyl(parent,k.tank,x,base+h+.04,z,r*.35,.08,'y',r*.35,10);
 for(const t of [.25,.75])cyl(parent,k.iron,x,base+h*t,z,r+.012,.035,'y',r+.012,14);
}
// Condenser with its fan grille on the local +z face.
function acUnit(parent,k,x,y,z,yaw=0){
 const g=group(parent,x,y,z,yaw);box(g,k.iron,0,.06,0,.86,.12,.42);box(g,k.enamel,0,.47,0,.9,.7,.36);
 cyl(g,k.grille,-.14,.47,.185,.25,.02,'z',.25,14);cyl(g,k.iron,-.14,.47,.197,.05,.012,'z',.05,8);
 for(let i=0;i<4;i++)box(g,k.grille,.3,.27+i*.12,.183,.18,.03,.012);return g;
}
// Offset dish on a pole; the concave face looks along local +z, raised by elevation.
const dishGeometry=new Map();
function satelliteDish(parent,k,x,y,z,yaw,{r=.42,pole=.9,elevation=.5}={}){
 const g=group(parent,x,y,z,yaw);cyl(g,k.iron,0,pole/2,0,.03,pole,'y',.03,8);
 const head=new T.Group();head.position.set(0,pole,0);head.rotation.x=-elevation;g.add(head);
 let geo=dishGeometry.get(r);if(!geo){const R=r/Math.sin(.56);geo=new T.SphereGeometry(R,18,3,0,Math.PI*2,0,.56);geo.rotateX(-Math.PI/2);geo.translate(0,0,R);dishGeometry.set(r,geo);}
 const dish=new T.Mesh(geo,k.dish);dish.position.set(0,.1,0);dish.castShadow=dish.receiveShadow=true;head.add(dish);
 box(head,k.iron,0,.1,-.03,.16,.16,.06);rod(head,k.iron,[0,.1-r*.92,r*.12],[0,.1-r*.12,r*1.08],.014);box(head,k.enamel,0,.1-r*.1,r*1.12,.07,.07,.12);
 return g;
}
function yagi(parent,k,x,y,z,yaw,h=2.6){
 const g=group(parent,x,y,z,yaw);cyl(g,k.iron,0,h/2,0,.022,h,'y',.022,6);box(g,k.iron,0,h-.12,0,1.3,.025,.025);
 for(let i=0;i<6;i++){const w=.62-i*.05;box(g,k.iron,-.58+i*.23,h-.12,0,.014,.014,w);}return g;
}

// --- A / MINARET ---
// Horseshoe blind arch: a proud frame around a keyhole recess, as on Maghrebi minarets.
function archFrame(width,height,spring,rise,depth,border=.18){
 const a=width/2-border,s=new T.Shape([new T.Vector2(-width/2,0),new T.Vector2(width/2,0),new T.Vector2(width/2,height),new T.Vector2(-width/2,height)]);
 const hole=new T.Path();hole.moveTo(-a,border);hole.lineTo(-a,spring);hole.absellipse(0,spring,a,rise,Math.PI,0,true);hole.lineTo(a,border);hole.closePath();s.holes.push(hole);
 return new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:10});
}
function panel(face,material,dark,y,out,{width,height,spring,rise,slit=true}){
 const m=new T.Mesh(archFrame(width,height,spring,rise,.09),material);m.position.set(0,y,out);m.castShadow=m.receiveShadow=true;face.add(m);
 if(slit){box(face,dark,0,y+spring*.62,out+.01,.34,spring*.7,.03);box(face,material,0,y+spring*.62+spring*.36,out+.04,.5,.08,.06);}
}
function minaret(root,p,k,x,z){
 const stone=p.stoneKit.ornament,trim=p.trimKit.ornament,g=group(root,x,0,z),W=4.2,H=24;
 block(g,stone,0,H/2,0,W,H,W,1.6);
 for(const y of [8.6,15.4])box(g,trim,0,y,0,W+.16,.22,W+.16);
 for(let f=0;f<4;f++){
  const face=group(g,0,0,0,f*Math.PI/2),o=W/2;
  panel(face,trim,k.shadow,16.1,o,{width:2.7,height:5.1,spring:3.1,rise:1.25});
  for(const u of [-.68,.68]){const twin=group(face,u,0,0);panel(twin,trim,k.shadow,9.4,o,{width:1.25,height:3.2,spring:2,rise:.62,slit:false});box(twin,k.shadow,0,10.6,o+.01,.26,1.1,.03);}
  // Glazed zellige band below the parapet, in the site's teal.
  box(face,k.tile,0,22.55,o+.035,W+.07,.95,.07);for(let u=-1.8;u<=1.81;u+=.45)box(face,k.brass,u,22.55,o+.075,.05,.95,.02);
  for(let u=-1.85;u<=1.86;u+=.74)box(face,trim,u,24.62,o-.16,.42,.75,.32);
 }
 box(g,trim,0,24.12,0,W+.3,.26,W+.3);
 // Lantern stage, dome and the three-ball jamour finial.
 block(g,stone,0,26.25,0,2,4,2,1.6);box(g,trim,0,28.32,0,2.3,.16,2.3);
 for(let f=0;f<4;f++){const face=group(g,0,0,0,f*Math.PI/2);panel(face,trim,k.shadow,24.6,1,{width:1.25,height:2.6,spring:1.55,rise:.55,slit:false});box(face,k.shadow,0,25.6,1.01,.62,1.6,.03);box(face,k.tile,0,27.7,1.035,2.07,.36,.07);}
 const dome=new T.Mesh(new T.SphereGeometry(.98,14,6,0,Math.PI*2,0,Math.PI/2),k.tile);dome.position.set(0,28.4,0);dome.castShadow=true;g.add(dome);
 cyl(g,k.brass,0,30.25,0,.045,2.4,'y',.045,6);
 for(const [y,r]of [[29.75,.3],[30.45,.23],[31.02,.16]]){const ball=new T.Mesh(new T.SphereGeometry(r,12,8),k.brass);ball.position.set(0,y,0);ball.castShadow=true;g.add(ball);}
}
// Pierced brass lantern hanging from a canopy soffit.
function lantern(parent,k,x,top,z,drop=.5){
 rod(parent,k.iron,[x,top,z],[x,top-drop,z],.007,5);const y=top-drop;
 cyl(parent,k.brass,x,y-.06,z,.035,.12,'y',.15,8);cyl(parent,k.brass,x,y-.13,z,.152,.03,'y',.152,8);
 cyl(parent,k.glow,x,y-.31,z,.13,.33,'y',.13,8);
 for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/8;box(parent,k.brass,x+Math.cos(a)*.134,y-.31,z+Math.sin(a)*.134,.02,.33,.02);}
 cyl(parent,k.brass,x,y-.49,z,.152,.03,'y',.152,8);cyl(parent,k.brass,x,y-.56,z,.15,.11,'y',.03,8);
 const tip=new T.Mesh(new T.SphereGeometry(.03,8,5),k.brass);tip.position.set(x,y-.64,z);parent.add(tip);
}
// Vertical blade sign reading bottom to top, projecting from a wall along local +x.
function bladeSign(parent,k,text,x,y,z,yaw,{length=2.7,width=.72,background='#21545b',color='#f1e3c2'}={}){
 const g=group(parent,x,y,z,yaw);box(g,k.brass,width/2,0,0,width+.08,length+.08,.09);
 for(const side of [1,-1]){const m=label(g,text,width/2,0,side*.052,length,width,side>0?0:Math.PI,{background,color,font:118,border:true});m.rotation.z=Math.PI/2;flag(m.material);m.castShadow=false;}
 for(const s of [1,-1])box(g,k.iron,width/2,s*(length/2+.07),0,width+.14,.04,.05);
 for(let i=0;i<7;i++){const b=new T.Mesh(new T.IcosahedronGeometry(.035,0),k.bulb);b.position.set(width+.08,-length/2+.2+i*(length-.4)/6,0);g.add(b);}
 return g;
}

// --- B / RIWAQ ---
// Kasbah vigas: roof beams whose ends pierce the rammed-earth wall.
function vigas(parent,material,{axis,fixed,from,to,y,normal,step=.92}){
 for(let t=from;t<=to;t+=step){const out=fixed+normal*.24,r=.1+.018*Math.sin(t*7.3),h=typeof y==='function'?y(t):y;if(axis==='z')cyl(parent,material,out,h,t,r,.48,'x',r,7);else cyl(parent,material,t,h,out,r,.48,'z',r,7);}
}
// Kilims drying over a wooden pole, with soft folds; flush to within 10 cm of the wall.
function rugs(parent,k,wood,{x,y,z,yaw,items}){
 const g=group(parent,x,y,z,yaw);let span=items.reduce((s,r)=>s+r.w,0)+(items.length-1)*.14,u=-span/2;
 cyl(g,wood,0,0,.11,.055,span+.6,'x',.055,8);for(const s of [-1,1])box(g,k.iron,s*(span/2+.12),0,.06,.05,.05,.12);
 for(const r of items){
  const geo=new T.PlaneGeometry(r.w,r.h,8,1),pos=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<pos.count;i++){const px=pos.getX(i),py=pos.getY(i);pos.setZ(i,.035*Math.sin((px/r.w+.5)*Math.PI*4+r.cell)*(.6+.4*(.5-py/r.h)));uv.setX(i,(r.cell+uv.getX(i))/4);}
  geo.computeVertexNormals();const m=new T.Mesh(geo,k.rug);m.position.set(u+r.w/2,-r.h/2+.02,.085);m.castShadow=false;m.receiveShadow=true;g.add(m);u+=r.w+.14;
 }
}
function festoon(parent,k,wire,a,b,{sag=1,spacing=.9}={}){
 const point=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-sag*4*t*(1-t),a[2]+(b[2]-a[2])*t];
 cable(parent,[0,.17,.34,.5,.66,.83,1].map(point),wire,.012);
 const length=Math.hypot(b[0]-a[0],b[2]-a[2]),count=Math.floor(length/spacing);
 for(let i=1;i<count;i++){const [x,y,z]=point(i/count),bulb=new T.Mesh(new T.IcosahedronGeometry(.05,0),k.bulb);bulb.position.set(x,y-.07,z);parent.add(bulb);}
 for(const end of [a,b])box(parent,k.iron,end[0],end[1],end[2],.08,.08,.08);
}

export function sahraSiteProps(root,p){
 const k=propKit(),wood=cosmetic(p.wood);wood.color.set(0xb38d63);
 // Rooftop props only stand well inside a real solid block, never over a route.
 const solidAt=(x,z,margin=.9)=>MAPS.sahra.walls.find(w=>w[5]===0&&Math.abs(x-w[0])<=w[2]/2-margin&&Math.abs(z-w[1])<=w[3]/2-margin);
 const top=(x,z)=>solidAt(x,z,0)?.[4]??0,onRoof=(x,z,fn)=>{const w=solidAt(x,z);if(w)fn(w[4]);};
 // A / MINARET: tower behind the court's back frontage, seen from the ramp and the
 // fountain court; lanterns under the hotel canopies; blade signs along the A lane.
 minaret(root,p,k,36,-50);
 for(const x of [25,29.6,36.4,41])lantern(root,k,x,6.74,-38.3);
 bladeSign(root,k,'HÔTEL  MINARET',42,6.4,-2.5,Math.PI);
 bladeSign(root,k,'HÔTEL  MINARET',44,7.7,-30.5,Math.PI,{length:2.4});
 onRoof(41,-17,y=>acUnit(root,k,41,y,-17,Math.PI));onRoof(41,-20,y=>acUnit(root,k,41,y,-20,Math.PI));
 onRoof(26,-18,y=>waterTank(root,k,26,y,-18));onRoof(47,-28,y=>satelliteDish(root,k,47,y,-28,-Math.PI/2+.4,{pole:.9}));
 onRoof(47.5,-36,y=>yagi(root,k,47.5,y,-36,.3,2.9));onRoof(28,-46,y=>waterTank(root,k,28,y,-46,{stand:.95}));
 onRoof(42,-46,y=>satelliteDish(root,k,42,y,-46,.2,{pole:1.15}));onRoof(45,-16,y=>satelliteDish(root,k,45,y,-16,-.5,{pole:1.3,r:.36}));
 // B / RIWAQ: kasbah beam ends under the parapets, kilims, festoons over the court.
 const beam=(x,z)=>Math.max(6.2,top(x,z)-.8);
 vigas(root,wood,{axis:'z',fixed:-46,normal:1,from:-41.4,to:-22.6,y:t=>beam(-47,t)});
 vigas(root,wood,{axis:'x',fixed:-42,normal:1,from:-45.4,to:-30.8,y:t=>beam(t,-43)});
 vigas(root,wood,{axis:'x',fixed:-22,normal:-1,from:-45.4,to:-34.8,y:t=>beam(t,-21)});
 vigas(root,wood,{axis:'z',fixed:-26,normal:-1,from:-33.4,to:-22.6,y:t=>beam(-25,t)});
 rugs(root,k,wood,{x:-46,y:Math.min(8.6,top(-47,-26.5)-1.3),z:-26.5,yaw:Math.PI/2,items:[{w:1.3,h:2.2,cell:0},{w:1.1,h:1.95,cell:2}]});
 rugs(root,k,wood,{x:-42,y:Math.min(8.4,top(-43,4)-1.3),z:4,yaw:Math.PI/2,items:[{w:1.25,h:2.3,cell:1},{w:1.1,h:2.05,cell:3}]});
 rugs(root,k,wood,{x:-26,y:Math.min(8.4,top(-25,-27)-1.3),z:-27,yaw:-Math.PI/2,items:[{w:1.2,h:2.2,cell:2}]});
 const wire=std({color:0x2a2c2a,roughness:.8});
 festoon(root,k,wire,[-45.95,7.1,-24.5],[-26.05,7.5,-28.5]);festoon(root,k,wire,[-45.95,7.3,-29.5],[-30.6,7.5,-41.95],{sag:.85});
 onRoof(-49,-30,y=>satelliteDish(root,k,-49,y,-30,Math.PI/2+.4,{pole:1.2}));onRoof(-49,-38,y=>yagi(root,k,-49,y,-38,1.2,2.8));
 onRoof(-38,-45,y=>satelliteDish(root,k,-38,y,-45,-.3,{pole:1,r:.36}));onRoof(-40,-18,y=>satelliteDish(root,k,-40,y,-18,Math.PI+.3,{pole:1.25,r:.38}));
}

// Caldera A / TELEMETRIA: lattice mast with dish, sector panels and beacon on the
// roof of the CT block behind the site, a cable tray above the station sign and a
// flush field cabinet below it, past the sign's end.
export function calderaSiteProps(root,site){
 if(!site)return;const k=propKit(),x=site.x,z=-22,face=-20;
 const roofTop=MAPS.caldera.walls.filter(w=>w[5]===0&&Math.abs(x-w[0])<=w[2]/2&&Math.abs(z-w[1])<=w[3]/2).reduce((h,w)=>Math.max(h,w[4]),0),top=roofTop||7.4;
 box(root,k.enamel,x+1.15,top+.36,z,.9,.72,.5);box(root,k.grille,x+1.15,top+.42,z+.255,.6,.3,.01);
 const legs=[0,1,2].map(i=>{const a=i*Math.PI*2/3+Math.PI/2;return [x+Math.cos(a)*.34,z+Math.sin(a)*.34];}),height=7.6;
 for(const [lx,lz]of legs)rod(root,k.iron,[lx,top,lz],[lx,top+height,lz],.028);
 for(let y=0;y<height-.5;y+=.76)for(let i=0;i<3;i++){const [ax,az]=legs[i],[bx,bz]=legs[(i+1)%3];rod(root,k.iron,[ax,top+y,az],[bx,top+y+.76,bz],.011,4);if(i===0||y%1.52<.1)rod(root,k.iron,[ax,top+y,az],[bx,top+y,bz],.011,4);}
 for(const s of [-1,1])rod(root,k.iron,[x+s*.12,top+height,z],[x+s*.12,top+height+2.3,z],.012,4);
 const beacon=new T.Mesh(new T.SphereGeometry(.07,10,6),k.beacon);beacon.position.set(x,top+height+.08,z);root.add(beacon);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,px=x+Math.sin(a)*.5,pz=z+Math.cos(a)*.5,g=group(root,px,top+height-.7,pz,a);box(g,k.enamel,0,0,0,.16,.95,.07);}
 satelliteDish(root,k,x,top+3.4,z+.36,0,{r:.62,pole:.01,elevation:.32});
 // Cable tray between the fascia and the glazing, risers beyond both ends of the sign.
 const trayY=3.86,from=-3.7,to=3.7,mid=(from+to)/2,len=to-from,riser=3.78;
 box(root,k.iron,mid,trayY,face+.16,len,.025,.3);for(const s of [.02,.3])box(root,k.iron,mid,trayY+.04,face+s,len,.08,.012);
 for(let u=from+.4;u<to;u+=1.2)box(root,k.iron,u,trayY-.05,face+.14,.04,.08,.28);
 for(const [dz,r]of [[.1,.022],[.16,.018],[.22,.025]])cyl(root,k.grille,mid,trayY+.035,face+dz,r,len,'x',r,6);
 cyl(root,k.iron,riser,(trayY+2.15)/2,face+.05,.03,trayY-2.15,'y',.03,8);cyl(root,k.iron,-3.85,(trayY+top)/2,face+.05,.03,top-trayY,'y',.03,8);
 box(root,k.enamel,riser,1.45,face+.05,.42,1.2,.1);box(root,k.grille,riser,1.45,face+.104,.34,1.06,.006);box(root,k.led,riser-.12,1.9,face+.11,.04,.04,.01);
 const plate=label(root,'⚡  T-07  /  400 V',riser,1.2,face+.116,.4,.1,0,{background:'#d6b041',color:'#2a2a22',font:120});flag(plate.material);
}
