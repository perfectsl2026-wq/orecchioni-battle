import * as T from './vendor/three.module.js';
import {groundHeight,blocked} from './shared.js?v=41.0';
import {box,cyl,bevel,label} from './graphics.js?v=41.0';
import {metricBlock as block} from './caldera-architecture.js?v=41.0';
import {cornice,sill,course,keystone,scupper,downspout,cosmetic,ORNAMENT_HEIGHT} from './trim-kit.js?v=41.0';
import {sahraInterior} from './sahra-layout.js?v=41.0';
import {vehicleGreenhouse} from './vehicles.js?v=41.0';
let awningMat=null;
function awning(){
 if(awningMat)return awningMat;
 const c=document.createElement('canvas');c.width=256;c.height=16;const x=c.getContext('2d');
 for(let i=0;i<8;i++){x.fillStyle=i%2?'#e7dcc4':'#b4573c';x.fillRect(i*32,0,32,16);}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;t.repeat.set(1.5,1);
 awningMat=new T.MeshStandardMaterial({map:t,roughness:.95});awningMat.userData.nonBallistic=true;return awningMat;
}
// Small closed workshops/market pavilions split the large courts. Every main
// volume follows its shared solid; shallow facade relief never becomes cover.
export function desertAnnex(root,p,x,z,w,d,h,base){
 const body=x<0?p.stuccoOchre:p.stuccoWhite;
 block(root,body,x,(h+base-.14)/2,z,w,h-base-.14,d,2.8);
 box(root,p.trim,x,h-.07,z,w+.08,.14,d+.08);
 for(const side of [-1,1]){box(root,p.trim,x+side*(w/2-.06),h+.06,z,.12,.12,d);box(root,p.trim,x,h+.06,z+side*(d/2-.06),w,.12,.12);}
 const market=z>24,finish=market?(p.shutterMarket||p.shutterOlive):(p.shutter||p.blue);
 // An inset petrol fascia and copper return unify the contemporary market.
 for(const side of [-1,1]){box(root,p.blue,x,h-.38,z+side*(d/2+.018),w-.12,.32,.035);box(root,p.copper,x+side*(w/2+.018),h-.38,z,.035,.32,d-.12);}
 for(const [along,side,extent]of [[true,-1,w],[true,1,w],[false,-1,d],[false,1,d]]){
  const fx=along?x:x+side*(w/2+.15),fz=along?z+side*(d/2+.15):z;
  if(blocked(fx,fz,.04))continue;
  const face=new T.Group();face.position.set(along?x:x+side*w/2,0,along?z+side*d/2:z);face.rotation.y=along?(side===1?0:Math.PI):(side===1?Math.PI/2:-Math.PI/2);root.add(face);
  for(let off=-extent/2;off<extent/2;off+=1){const span=Math.min(1,extent/2-off),u=off+span/2,wx=face.position.x+Math.cos(face.rotation.y)*u,wz=face.position.z-Math.sin(face.rotation.y)*u,y=groundHeight(wx,wz);block(face,p.wornStone,u,y+.26,.025,span,.52,.045,1.3);}
  const y=groundHeight(fx,fz),width=Math.min(2.5,extent-1.1),height=Math.min(2.35,h-y-.6);
  box(face,finish,0,y+height/2,.032,width,height,.04);
  for(const u of [-1,1])box(face,p.trim,u*(width/2+.06),y+height/2,.052,.1,height+.12,.055);
  for(let yy=y+.16;yy<y+height;yy+=.2)box(face,p.metal,0,yy,.06,width-.1,.025,.024);
  box(face,p.trim,0,y+height+.08,.056,width+.3,.15,.065);
  // Striped canvas awning with a hanging valance above each shutter, out of head height; cosmetic.
  const aw=box(face,awning(),0,y+height+.42,.46,width+.1,.025,.82);aw.rotation.x=.36;aw.castShadow=true;
  box(face,awning(),0,y+height+.21,.85,width+.1,.13,.015);
  box(face,p.doorIron,width*.34,y+1.05,.073,.08,.23,.026);
  if(h-y>4.6){box(face,p.dark,0,h-.7,.032,Math.min(width+.8,extent-.4),.28,.035);for(let u=-width*.4;u<width*.5;u+=.24)box(face,p.metal,u,h-.7,.055,.05,.23,.02);}
 }
}
// Region-specific closed facades. Relief stays within 10 cm of shared solids.
export function desertFacade(root,p,{x,z,width,height:h,angle,serial}){
 const face=new T.Group();face.position.set(x,0,z);face.rotation.y=angle;root.add(face);
 // Districts: stone piers inside the covered souk, hammam, loggia and arcade;
 // kasbah masonry around the B gate and court; the hotel frontage around A.
 const tunnel=!!sahraInterior(x,z)||(x>=23.9&&x<=32.1&&z>12&&z<28),castle=x<-25&&z<-6,hotel=x>21&&z<-23;
 const white=hotel?p.stuccoRose:serial%3===0?p.stuccoOchre:serial%3===1?p.plaster:p.stuccoWhite;
 // Ashlar courses read at about 29 cm (1.9 m per texture tile); plaster keeps its 2.8 m.
 block(face,castle||tunnel?p.stone:white,0,h/2,.02,width,h,.035,castle||tunnel?1.9:2.8);
 for(let off=-width/2;off<width/2-.01;off+=2){const w=Math.min(2,width/2-off),u=off+w/2,wx=x+Math.cos(angle)*u+Math.sin(angle)*.08,wz=z-Math.sin(angle)*u+Math.cos(angle)*.08,y=groundHeight(wx,wz);block(face,p.wornStone,u,y+.3,.046,w,.6,.04,1.2);}
 const kit=p.trimKit;
 if(castle||tunnel||!kit)box(face,p.trim,0,h-.2,.045,width,.18,.08);
 else cornice(face,kit,width,h-.02,{modern:hotel,brackets:serial%2===0});
 if(castle){
  for(let u=-width/2+.6;u<width/2;u+=2.3)box(face,p.stone,u,h+.38,.035,1.1,.75,.22);
  // Restored sandstone below, a new recessed-looking metal gallery above.
  box(face,p.blue,0,4.05,.045,width-.12,.5,.035);
  for(let u=-width/2+.5;u<width/2-.2;u+=2.3){box(face,p.copper,u,4.05,.073,.055,.5,.025);}
  for(let u=-width/2+2;u<width/2-1;u+=5.3){box(face,p.dark,u,5.3,.05,.3,.92,.025);box(face,p.trim,u,5.83,.055,.48,.14,.05);}
  return face;
 }
 if(tunnel){
  // Stone piers and spring courses replace street windows inside the vault.
  for(let u=-width/2+.8;u<width/2;u+=4){block(face,p.wornStone,u,2.1,.055,.55,4.2,.08,1.2);box(face,kit?kit.ornament:p.trim,u,3.2,.08,.78,.18,.08);}
  box(face,p.trim,0,2.85,.055,width,.14,.07);return face;
 }
 // Break long masses into individual houses using shallow vertical reveals.
 const step=hotel?4.8:5.2;
 if(hotel){
  const y=groundHeight(x,z)+3.0;
  box(face,p.blue,0,y+.1,.049,width-.12,1.55,.035);
  box(face,p.copper,0,y-.7,.071,width-.12,.065,.025);
  for(let u=-width/2+.4;u<width/2-.2;u+=2.1){box(face,p.glass,u+.78,y+.1,.072,1.5,1.36,.022);box(face,p.siteIvory,u,y+.1,.085,.075,1.62,.025);}
  for(let u=-width/2+.8;u<width/2;u+=4.8){box(face,p.copper,u,groundHeight(x,z)+1.4,.066,.05,2.6,.025);}
  return face;
 }
 box(face,p.blue,0,h-1.05,.047,width-.12,.48,.035);
 box(face,p.copper,0,h-1.33,.065,width-.12,.045,.025);
 if(kit){
  // A string course above the doors ties each run together at the same datum.
  course(face,kit,width-.04,2.62);
  // Roof spouts every few metres throw water clear; their stains are the decal drips.
  for(let u=-width/2+1.3;u<width/2-1;u+=3.7)scupper(face,kit.ornament,u,h-.62);
  if(width>=6.5){const u=-width/2+.25+Math.max(1,Math.round(width/2/step))*step;if(Math.abs(u)<width/2-.8){const wx=x+Math.cos(angle)*u,wz=z-Math.sin(angle)*u;downspout(face,p.metal,u,groundHeight(wx,wz)+.05,h-.62);}}
 }
 for(let u=-width/2+.25;u<width/2-.1;u+=step){box(face,p.trim,u,(h+1)/2,.052,.13,h-1,.045);}
 for(let u=-width/2+1.65;u<width/2-1.1;u+=step){
  window(face,p,u,hotel?groundHeight(x,z)+3.2:3.9,hotel||serial%3===0?1.25:1.02,hotel?1.8:1.6,(serial+(u|0))%3===0?p.shutterOlive:p.blue);
  if(h>9.5&&serial%2===0)window(face,p,u,6.8,1,1.45,p.wood);
 }
 // Flush closed shop fronts sit on the actual sloping street datum.
 if(!hotel&&width>=5&&serial%3===0){const y=groundHeight(x+Math.sin(angle)*.1,z+Math.cos(angle)*.1);if(p.facadeDoor){p.facadeDoor(x,y,z,angle);return face;}box(face,p.dark,0,y+1.2,.05,1.55,2.4,.025);block(face,p.doorPaint||p.wood,0,y+1.2,.075,1.4,2.36,.03,1.2);for(const side of [-1,1])box(face,p.wornStone,side*.82,y+1.28,.06,.12,2.56,.07);box(face,p.trim,0,y+2.62,.07,1.85,.17,.08);}
 return face;
}
function archShape(w,h){const r=w/2,spring=h-r,s=new T.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,spring);s.absarc(0,spring,r,0,Math.PI,false);s.lineTo(-r,0);return s;}
function window(parent,p,x,y,w,h,shutter){
 const s=archShape(w+.2,h+.2),hole=archShape(w,h);s.holes.push(new T.Path(hole.getPoints(20).map(v=>new T.Vector2(v.x,v.y+.08))));const frame=new T.Mesh(new T.ExtrudeGeometry(s,{depth:.045,bevelEnabled:false,curveSegments:14}),p.trim);frame.position.set(x,y,.045);parent.add(frame);
 const dark=new T.Mesh(new T.ShapeGeometry(archShape(w,h),18),p.dark);dark.position.set(x,y+.08,.048);parent.add(dark);const panelH=h-w/2-.035;
 for(const side of [-1,1]){box(parent,shutter,x+side*w*.255,y+panelH/2,.07,w*.46,panelH,.035);for(let slat=0;slat<4;slat++)box(parent,p.dark,x+side*w*.255,y+.16+slat*(panelH-.22)/4,.093,w*.39,.018,.012);}
 if(p.trimKit){sill(parent,p.trimKit,x,y,w+.34);if(y+h>ORNAMENT_HEIGHT)keystone(parent,p.trimKit.ornament,x,y+h+.14,{width:.2,height:.28,depth:.06,offset:.075});}
 else box(parent,p.trim,x,y-.055,.07,w+.28,.12,.09);
}
// Crates and cargo pods are detailed on all four faces and on the lid. Each face
// gets steel rails and corner posts; timber crates add planks, a diagonal brace,
// bolts and stencils, and cargo pods add ribs, corner castings, an ID plate and,
// on one end, the split door with its locking bars and handles. Relief stays
// within 6 cm of the solid; the lid battens rise 4 mm so feet never sink into them.
export function desertCrate(root,p,x,z,w,d,top,base,metal=false){
 const group=new T.Group();group.position.set(x,base,z);root.add(group);const h=top-base,olive=x>25,body=metal?p.cargoBlue:olive?p.crateOlive:x<-30?p.crateTan:p.crate;block(group,body,0,h/2,0,w,h,d,1.1);
 const faces=[[0,d/2,0,w],[0,-d/2,Math.PI,w],[w/2,0,Math.PI/2,d],[-w/2,0,-Math.PI/2,d]],doorEnd=Math.abs(Math.round(x*3+z))%2?2:3;
 faces.forEach(([fx,fz,yaw,extent],i)=>{
  const f=new T.Group();f.position.set(fx,0,fz);f.rotation.y=yaw;group.add(f);const main=i<2;
  for(const yy of [.1,h-.1])box(f,p.metal,0,yy,.018,extent,.09,.035);
  for(const u of [-extent/2+.1,extent/2-.1])box(f,p.metal,u,h/2,.025,.09,h,.04);
  if(metal){
   if(i===doorEnd){
    box(f,p.dark,0,h/2,.03,.014,h-.22,.02);
    for(const u of [-extent*.3,-extent*.1,extent*.1,extent*.3]){
     cyl(f,p.metal,u,h/2,.052,.016,h-.26,'y',.016,8);
     for(const yy of [.2,h-.2])box(f,p.metal,u,yy,.045,.07,.05,.03);
     const handle=box(f,p.metal,u+.06,h*.42,.066,.14,.025,.02);handle.rotation.z=-.35;
    }
   }else for(let u=-extent/2+.22;u<extent/2-.14;u+=.32)box(f,p.cargoBlue,u,h/2,.025,.075,h-.24,.04);
   if(main){const id=label(f,'OBXU 290 · 7',-extent*.22,h*.72,.046,Math.min(.9,extent*.4),.14,0,{background:'#1f3438',color:'#e8e2cf',font:96});id.material.userData.nonBallistic=true;}
  }else{
   for(let u=-extent/2+.25;u<extent/2-.1;u+=.42)box(f,p.wornWood,u,h/2,.026,.025,h-.2,.035);
   const span=Math.max(.1,extent-.25),beam=box(f,p.wornWood,0,h/2,.03,span,.08,.035);beam.rotation.z=(i%2?-1:1)*Math.atan2(h-.25,span);beam.scale.x=Math.hypot(span,h-.25)/span;
   if(main){for(const u of [-extent*.38,extent*.38])for(const yy of [.18,h-.18])cyl(f,p.metal,u,yy,.06,.024,.018,'z',.024,6);label(f,olive?'07 / FIELD EQUIPMENT':'NORTHLINE  /  ↑↑',0,h*.68,.055,Math.min(extent*.65,1.8),.24,0,{background:olive?'#78816a':'#b49b72',color:'#e6dfc9',font:64});}
   else if(extent>1.3){const st=label(f,olive?'↑  THIS SIDE UP  ↑':'FRAGILE · '+(p.crateStamp||'SAHRA 13'),0,h*.5,.058,Math.min(extent*.6,1.2),.14,0,{background:olive?'#78816a':'#b49b72',color:'#2c2a22',font:70});st.material.userData.nonBallistic=true;}
  }
 });
 if(metal){
  // Corner castings flush with the faces, and shallow roof bows.
  for(const sx of [-1,1])for(const sz of [-1,1])for(const yy of [.06,h-.06])box(group,p.dark,sx*(w/2-.05),yy,sz*(d/2-.05),.12,.12,.12);
  for(let u=-w/2+.4;u<w/2-.3;u+=.6)box(group,p.metal,u,h+.004,0,.05,.012,d-.16);
 }else{
  // Lid: three battens across the boards and a stencilled grade mark.
  const along=w>=d;for(const t of [-.36,0,.36])box(group,p.wornWood,along?t*w:0,h+.004,along?0:t*d,along?.1:w-.12,.012,along?d-.12:.1);
 }
 return group;
}
// Sawn timber stacked in layers on spacer sticks, with end grain on both ends and
// two steel straps. The layers fill the solid (3.5 cm spacer gaps show a dark core).
const grainCache=new Map();
function endGrain(p,beams){
 let m=grainCache.get(p)?.[beams];if(m)return m;
 if(!grainCache.has(p))grainCache.set(p,{});
 if(!p.endGrainMap){
  // Four sawn ends with their own tint and pith position, so a stack never reads as a grid:
  // fresh cuts next to ends weathered grey-brown, the way a stack left in the sun looks.
  const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');
  [['#c4a77a',46,70],['#9c8261',70,52],['#b89a6d',58,62],['#8d7455',66,74]].forEach(([tone,cx,cy],i)=>{
   const o=i*128;x.fillStyle=tone;x.fillRect(o,0,128,128);x.strokeStyle='rgba(122,82,42,.5)';x.lineWidth=2.5;
   for(let r=5;r<90;r+=5+(i%2)*2){x.beginPath();x.ellipse(o+cx,cy,r*1.06,r,0,0,Math.PI*2);x.stroke();}
   // Pith, a drying check running out from it, and the darker edge of the sawn face.
   x.fillStyle='#6b4a28';x.fillRect(o+cx-3,cy-3,6,6);const ca=.7+i*1.9;x.strokeStyle='rgba(70,46,22,.8)';x.lineWidth=2;x.beginPath();x.moveTo(o+cx,cy);x.lineTo(o+cx+Math.cos(ca)*34,cy+Math.sin(ca)*34);x.stroke();
   x.fillStyle='#5a4228';x.fillRect(o,0,128,4);x.fillRect(o,124,128,4);x.fillRect(o,0,4,128);x.fillRect(o+124,0,4,128);
  });
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;p.endGrainMap=t;
 }
 const t=p.endGrainMap.clone();t.repeat.set(beams/4,1);t.needsUpdate=true;
 m=new T.MeshStandardMaterial({color:0xffffff,map:t,roughness:.95});grainCache.get(p)[beams]=m;return m;
}
export function desertTimber(root,p,x,z,w,d,top,base){
 const g=new T.Group();g.position.set(x,base,z);root.add(g);const h=top-base,alongZ=d>=w,len=alongZ?d:w,cross=alongZ?w:d,gap=.035;
 const layers=Math.max(2,Math.round(h/.26)),lh=(h-(layers-1)*gap)/layers,beams=Math.max(2,Math.round(cross/.2)),grain=endGrain(p,beams);
 const put=(mat,a,y,c,la,hy,ca,tile=0)=>(tile?(...q)=>block(...q,tile):box)(g,mat,alongZ?c:a,y,alongZ?a:c,alongZ?ca:la,hy,alongZ?la:ca);
 put(p.dark,0,(h-.03)/2,0,len-.08,h-.03,cross-.08);
 for(let k=0;k<layers;k++){
  const y=k*(lh+gap)+lh/2,shift=k%2?.008:-.008;
  put(p.lumber||p.crate,shift,y,0,len-.03,lh,cross,1.1);
  for(const end of [-1,1])put(grain,shift+end*((len-.03)/2+.006),y,0,.012,lh,cross);
  if(k<layers-1)for(const a of [-len*.38,0,len*.38])put(p.wornWood,a,y+lh/2+gap/2,0,.07,gap,cross);
 }
 for(let b=1;b<beams;b++)put(p.dark,0,h+.002,-cross/2+b*cross/beams,len-.06,.006,.012);
 for(const a of [-len*.25,len*.25]){put(p.metal,a,h+.004,0,.05,.008,cross+.012);for(const s of [-1,1])put(p.metal,a,h/2,s*(cross/2+.004),.05,h,.008);}
 return g;
}
export function desertColumn(root,p,x,z,w,d,top,base){
 // Painted steel column: base plate with anchor bolts, a cap plate and a vertical
 // seam. The plates and bolts stand proud of the solid, so they are cosmetic.
 const g=new T.Group();g.position.set(x,base,z);root.add(g);const h=top-base,plate=p.plateCosmetic||(p.plateCosmetic=cosmetic(p.dark)),cap=p.capCosmetic||(p.capCosmetic=cosmetic(p.metal));
 box(g,p.metal,0,h/2,0,w,h,d);box(g,plate,0,.015,0,w+.16,.03,d+.16);box(g,cap,0,h-.04,0,w+.08,.08,d+.08);
 for(const sx of [-1,1])for(const sz of [-1,1])cyl(g,plate,sx*(w/2+.05),.05,sz*(d/2+.05),.018,.04,'y',.018,6);
 for(const s of [-1,1])box(g,p.dark,0,h/2,s*(d/2+.002),.01,h-.2,.004);
 return g;
}
export function desertDoors(root,p,doors){
 for(const b of doors){
  const g=new T.Group();g.position.set(b.x,b.y-b.h/2,b.z);g.rotation.y=b.yaw;root.add(g);
  block(g,p.doorPaint||p.wood,0,b.h/2,0,b.w,b.h,b.d,.9);
  for(const y of [.4,1.55,2.7])cyl(g,p.doorIron,b.side*b.w/2,y,0,.045,.2,'y',.045,10);
  for(let u=-b.w/2+.16;u<b.w/2;u+=.27)for(const side of [-1,1])box(g,p.wornWood,u,b.h/2,side*(b.d/2+.008),.016,b.h-.08,.018);
  for(const side of [-1,1]){
   for(const y of [.32,1.52,2.82]){box(g,p.doorIron,0,y,side*(b.d/2+.024),b.w-.1,.11,.035);for(let u=-b.w/2+.13;u<b.w/2;u+=.31)cyl(g,p.metal,u,y,side*(b.d/2+.045),.028,.018,'z',.028,8);}
   for(const y of [.22,2.92])box(g,p.wornWood,0,y,side*(b.d/2+.012),b.w-.05,.07,.025);
   const x=-b.side*(b.w/2-.23);box(g,p.doorIron,x,1.22,side*(b.d/2+.031),.15,.24,.035);
   const ring=new T.Mesh(new T.TorusGeometry(.085,.014,6,16),p.doorIron);ring.position.set(x,1.17,side*(b.d/2+.06));g.add(ring);
  }
 }
}
export function desertArchTrim(root,p,a){
 if(a.vault)return;
 const g=new T.Group();g.position.set(a.x,0,a.z);if(a.axis==='x')g.rotation.y=Math.PI/2;root.add(g);
 const kit=p.trimKit,stoneKit=p.stoneKit,r=a.width/2,count=13,joint=.012;
 // Voussoirs on an elliptical extrados: odd count so a keystone closes the crown;
 // alternate depths read as individually laid stones. The hood band follows above.
 const stone=(t0,t1,inner,outer,depth,zFace,material)=>{const s=new T.Shape();
  s.moveTo(Math.cos(t0)*(r+inner),a.spring+Math.sin(t0)*(a.rise+inner));s.lineTo(Math.cos(t1)*(r+inner),a.spring+Math.sin(t1)*(a.rise+inner));s.lineTo(Math.cos(t1)*(r+outer),a.spring+Math.sin(t1)*(a.rise+outer));s.lineTo(Math.cos(t0)*(r+outer),a.spring+Math.sin(t0)*(a.rise+outer));s.closePath();
  const m=new T.Mesh(new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:1}),material);m.position.z=zFace;m.castShadow=m.receiveShadow=true;g.add(m);return m;};
 for(const side of [-1,1]){
  const front=side>0?a.depth/2+.004:-a.depth/2-.004,z=d=>side>0?front:front-d;
  for(let n=0;n<count;n++){
   const t0=n*Math.PI/count+joint,t1=(n+1)*Math.PI/count-joint,key=n===(count-1)/2,low=Math.min(Math.sin(t0),Math.sin(t1))*a.rise+a.spring<ORNAMENT_HEIGHT;
   const depth=key?.085:n%2?.06:.045,outer=key?.36:.25+(n%2)*.03,mat=!kit?(n%4===0?p.wornStone:p.trim):key?kit.ornament:low?(stoneKit||kit).base:(stoneKit||kit).ornament;
   stone(t0,t1,0,outer,low?Math.min(depth,.05):depth,z(low?Math.min(depth,.05):depth),mat);
  }
  if(kit){
   // Hood moulding over the voussoirs and moulded imposts at the springing line.
   for(let n=0;n<24;n++){const t0=n*Math.PI/24,t1=(n+1)*Math.PI/24;if(Math.min(Math.sin(t0),Math.sin(t1))*a.rise+a.spring<ORNAMENT_HEIGHT)continue;stone(t0,t1,.39,.45,.035,z(.035),kit.ornament);}
   for(const x of [-r-.2,r+.2]){const impost=new T.Mesh(new T.BoxGeometry(.46,.16,.06),a.spring>ORNAMENT_HEIGHT?kit.ornament:kit.base);impost.position.set(x,a.spring-.08,side>0?front+.03:front-.03);impost.castShadow=impost.receiveShadow=true;g.add(impost);}
  }
 }
}
// Closed masonry above the elliptical intrados, with no horizontal face across
// the open passage. Extruding a touching Shape hole would seal its spring line.
export function desertVaultGeometry(a){
 const pos=[],uv=[],indices=[],half=a.width/2,front=-a.depth/2,back=a.depth/2;
 const quad=(points,reverse=false,plane='xz')=>{const n=pos.length/3;for(const v of points){pos.push(...v);uv.push(v[0]/2.2,(plane==='xy'?v[1]:v[2])/2.2);}const q=reverse?[0,2,1,2,3,1]:[0,1,2,2,1,3];indices.push(...q.map(i=>n+i));};
 for(let n=0;n<64;n++){
  const x0=-half+a.width*n/64,x1=-half+a.width*(n+1)/64,y0=a.spring+a.rise*Math.sqrt(Math.max(0,1-(x0/half)**2)),y1=a.spring+a.rise*Math.sqrt(Math.max(0,1-(x1/half)**2));
  quad([[x0,y0,front],[x1,y1,front],[x0,y0,back],[x1,y1,back]]);
  quad([[x0,a.height,front],[x1,a.height,front],[x0,a.height,back],[x1,a.height,back]],true);
  quad([[x0,y0,front],[x0,a.height,front],[x1,y1,front],[x1,a.height,front]],false,'xy');
  quad([[x0,y0,back],[x0,a.height,back],[x1,y1,back],[x1,a.height,back]],true,'xy');
 }
 for(const side of [-1,1])quad([[half*side,a.spring,front],[half*side,a.spring,back],[half*side,a.height,front],[half*side,a.height,back]],side>0);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
// Original compact utility vehicle, modelled inside the shared envelope (vehicles.js):
// sculpted side panels with wheel arches, plastic flares and sill cladding over a dark
// core; bumpers, lamps, plates, door seams and handles; a glazed greenhouse on the
// stepped slopes with blacked-out B-pillars, glass seals and a painted roof; lathed
// tyres on spoked rims. Road dust rises from the sills. Mirrors, wipers, exhaust,
// rack and light bar are cosmetic.
const carCache=new WeakMap();let carDust=null;
function dustMap(){
 if(carDust)return carDust;
 // Side-panel UVs are shape coordinates in metres, so v is the height above the
 // ground: clean above the belt line, fine dust and speckle building to the sills.
 const c=document.createElement('canvas');c.width=64;c.height=128;const x=c.getContext('2d');
 const stops=[[0,255,255,255],[.45,251,248,242],[.6,228,217,196],[.72,204,187,156],[.82,183,162,129],[1,164,143,107]];
 for(let row=0;row<128;row++){const t=row/127,i=stops.findIndex(q=>q[0]>=t),a=stops[Math.max(0,i-1)],b=stops[i],k=b[0]>a[0]?(t-a[0])/(b[0]-a[0]):0;
  x.fillStyle=`rgb(${[1,2,3].map(j=>Math.round(a[j]+(b[j]-a[j])*k)).join(',')})`;x.fillRect(0,row,64,1);}
 let s=11;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
 for(let i=0;i<520;i++){const yy=62+rnd()*66,a=.04+.14*(yy-62)/66;x.fillStyle=`rgba(112,92,62,${a.toFixed(3)})`;x.fillRect(rnd()*64,yy,1+rnd()*2,1+rnd()*3);}
 carDust=new T.CanvasTexture(c);carDust.colorSpace=T.SRGBColorSpace;carDust.wrapS=T.RepeatWrapping;carDust.wrapT=T.ClampToEdgeWrapping;carDust.repeat.set(.7,1);
 return carDust;
}
function carMaterials(p){
 let m=carCache.get(p);if(m)return m;
 const mk=(color,roughness,metalness=0,emissive=0,intensity=0)=>new T.MeshStandardMaterial({color,roughness,metalness,emissive,emissiveIntensity:intensity});
 m={red:mk(0x8e2a22,.35,.1,0x5a120c,.45),amber:mk(0xc7791f,.4,.1,0x6a3a08,.35),chrome:mk(0xb9c0bd,.28,.85),rubber:mk(0x23292a,.92),rim:mk(0x9aa3a1,.35,.75),plate:mk(0xe9e6da,.6),
  tinted:mk(0x26363b,.08,.4),seam:mk(0x1c2426,.9),under:mk(0x2a3132,.95),plastic:mk(0x2b3031,.78,.05),dusty:new Map()};
 m.trim=cosmetic(m.chrome);m.rack=cosmetic(mk(0x2e3436,.6,.5));m.bar=cosmetic(mk(0xd9822b,.45,.2,0x7a3a08,.6));m.fitting=cosmetic(m.plastic);m.mirror=cosmetic(mk(0x8fa3a6,.06,.9));m.can=cosmetic(mk(0x55603f,.7,.2));
 const profile=[[.16,-.09],[.255,-.09],[.29,-.07],[.3,-.04],[.3,.04],[.29,.07],[.255,.09],[.16,.09]].map(([r,y])=>new T.Vector2(r,y));
 m.tyre=new T.LatheGeometry(profile,16);m.tyre.rotateZ(Math.PI/2);
 // Wheel-arch flare: a flattened tube following the arch opening of the side panel.
 const arch=Math.atan2(.195-.31,Math.sqrt(.37*.37-(.31-.195)**2));
 m.flare=new T.TorusGeometry(.385,.03,4,14,Math.PI-2*arch);m.flare.rotateZ(arch);m.flare.rotateY(Math.PI/2);m.flare.scale(.6,1,1);
 carCache.set(p,m);return m;
}
function dusty(m,paint){
 let d=m.dusty.get(paint);if(d)return d;
 d=paint.clone();d.onBeforeCompile=paint.onBeforeCompile;d.customProgramCacheKey=paint.customProgramCacheKey;d.map=dustMap();d.needsUpdate=true;m.dusty.set(paint,d);return d;
}
function sidePanel(d,wz){
 const s=new T.Shape(),front=-d/2,back=d/2,r=.37,cy=.31,dx=Math.sqrt(r*r-(cy-.195)**2),a0=Math.atan2(.195-cy,-dx),a1=Math.atan2(.195-cy,dx);
 s.moveTo(front+.14,.195);
 for(const c of [-wz,wz]){s.lineTo(c-dx,.195);s.absarc(c,cy,r,a0+Math.PI*2,a1,true);}
 s.lineTo(back-.14,.195);s.quadraticCurveTo(back,.2,back,.4);s.lineTo(back,.6);s.quadraticCurveTo(back-.01,.745,back-.12,.745);
 s.lineTo(front+.16,.745);s.quadraticCurveTo(front+.01,.735,front,.6);s.lineTo(front,.4);s.quadraticCurveTo(front,.2,front+.14,.195);
 const g=new T.ExtrudeGeometry(s,{depth:.1,bevelEnabled:false,curveSegments:10});g.rotateY(-Math.PI/2);g.translate(.05,0,0);return g;
}
export function desertCar(root,p,x,y,z,w,d){
 const g=new T.Group();g.position.set(x,y,z);root.add(g);
 const paints=p.carPaints||[p.carPaint],serial=p.carSerial=(p.carSerial??-1)+1;
 const m=carMaterials(p),paint=paints[serial%paints.length],dust=dusty(m,paint),live=p.vehicle||{},half=w/2,front=-d/2,back=d/2,wz=d*.3;
 const {zc,L,width:cw,zf,zt,zr,zb,top}=vehicleGreenhouse(w,d);
 // Lower body: dark core seen through the arches (its top stays under the deck),
 // dusty side and end panels, a flush deck, arch flares and sill cladding.
 box(g,m.under,0,.445,0,w-.24,.5,d-.06);
 const panel=sidePanel(d,wz);for(const side of [-1,1]){const mesh=new T.Mesh(panel,dust);mesh.position.x=side*(half-.06);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);}
 box(g,paint,0,.72,(front+back)/2,w-.2,.05,d-.2);box(g,dust,0,.5,front+.04,w-.2,.42,.08);box(g,dust,0,.5,back-.04,w-.2,.42,.08);
 for(const s of [-1,1]){
  for(const dz of [-wz,wz]){const f=new T.Mesh(m.flare,m.plastic);f.position.set(s*(half-.02),.31,dz);g.add(f);}
  box(g,m.plastic,s*(half-.007),.235,0,.012,.08,2*wz-.86);
  for(const end of [front,back])box(g,m.plastic,s*(half-.007),.235,end+Math.sign(-end)*(.07+(d/2-wz-.47)/2),.012,.08,Math.max(.05,d/2-wz-.47-.14));
 }
 // Bonnet seams and the cowl at the windscreen base; tailgate seam and handle.
 for(const s of [-1,1])box(g,m.seam,s*(half-.22),.746,(front+zf)/2,.012,.004,zf-front-.2);
 box(g,m.seam,0,.746,front+.1,w-.44,.004,.012);box(g,m.fitting,0,.755,zf-.07,cw-.1,.02,.13);
 box(g,m.seam,0,.66,back+.003,w-.3,.008,.006);box(g,m.chrome,0,.6,back+.006,.3,.04,.018);
 // Bumpers, grille, lamps and plates on both ends; a step on the rear bumper.
 for(const [end,dir]of [[front,1],[back,-1]]){
  box(g,m.plastic,0,.31,end+dir*.07,w-.05,.2,.14);box(g,m.chrome,0,.41,end+dir*.025,w-.25,.025,.03);
  const plate=box(g,m.plate,0,.31,end-dir*.004,.5,.12,.012);plate.castShadow=false;
  const tag=label(g,'OB · 29 · 07',0,.31,end-dir*.012,.46,.09,dir>0?Math.PI:0,{background:'#e9e6da',color:'#24313a',font:96});tag.material.userData.nonBallistic=true;
 }
 box(g,m.seam,0,.55,front-.003,.9,.16,.012);for(let u=-.38;u<=.381;u+=.095)box(g,m.chrome,u,.55,front-.008,.02,.13,.01);
 box(g,m.chrome,0,.635,front-.008,.92,.018,.01);
 for(const s of [-1,1]){
  // Headlamp: chrome bezel, lens and a smaller inner reflector; tail cluster.
  box(g,m.chrome,s*.66,.58,front-.004,.37,.16,.01);box(g,p.lamp,s*.66,.58,front-.009,.33,.12,.01);box(g,m.chrome,s*.6,.58,front-.012,.08,.08,.006);
  box(g,m.amber,s*.92,.58,front-.006,.1,.1,.014);box(g,m.amber,s*(half-.006),.62,front+.32,.012,.035,.09);
  box(g,m.seam,s*.72,.53,back+.004,.27,.37,.01);box(g,m.red,s*.72,.6,back+.009,.23,.2,.01);box(g,m.amber,s*.72,.47,back+.009,.23,.05,.01);box(g,m.plate,s*.72,.415,back+.009,.23,.03,.01);
  // Door seams, handles, belt moulding and the fuel flap on the side panels.
  const sx=s*(half-.004);
  for(const zz of [zf+.05,zc+.06,zb-.02])box(g,m.seam,sx,.47,zz,.006,.5,.012);
  box(g,m.seam,sx,.27,(zf+zb)/2+.03,.006,.012,zb-zf-.02);
  for(const zz of [zf+.32,zc+.32]){box(g,m.seam,s*(half+.004),.64,zz,.008,.05,.19);box(g,m.chrome,s*(half+.009),.64,zz,.012,.03,.15);}
  box(g,m.chrome,s*(half-.002),.735,zc,.008,.02,L+.3);if(s>0)cyl(g,m.seam,s*(half+.002),.58,back-.7,.07,.01,'x',.07,14);
  if(live.stripe){box(g,m.bar,s*(half+.003),.53,0,.004,.06,d-.4);const logo=label(g,live.logo||'',s*(half+.006),.6,zf+.62,.62,.16,s*Math.PI/2,{background:'#e4e3dc',color:'#2b4a4d',font:84});logo.material.userData.nonBallistic=true;}
  // Cosmetic mirrors: a dark housing on a short arm at the door's front corner, with the glass facing back.
  const arm=box(g,m.fitting,s*(cw/2+.05),.82,zf+.24,.12,.03,.05);arm.rotation.z=s*.25;
  box(g,m.fitting,s*(cw/2+.13),.88,zf+.22,.06,.13,.17);box(g,m.mirror,s*(cw/2+.13),.88,zf+.31,.05,.11,.006);
 }
 // Greenhouse on the windscreen and rear-window slopes: tinted glass body, painted
 // roof cap and A/C pillars, black B-pillars and rubber seals, all inside the stepped shot boxes.
 const gh=new T.Shape([new T.Vector2(zf,.745),new T.Vector2(zb,.745),new T.Vector2(zr,top),new T.Vector2(zt,top)]);
 const greenhouse=new T.ExtrudeGeometry(gh,{depth:cw-.04,bevelEnabled:false});greenhouse.rotateY(-Math.PI/2);greenhouse.translate((cw-.04)/2,0,0);
 const glassBody=new T.Mesh(greenhouse,m.tinted);glassBody.castShadow=glassBody.receiveShadow=true;g.add(glassBody);
 box(g,paint,0,top-.025,(zt+zr)/2,cw-.02,.05,zr-zt);box(g,paint,0,.77,(zf+zb)/2,cw,.05,zb-zf);
 for(const s of [-1,1])box(g,m.seam,s*(cw/2-.03),top-.058,(zt+zr)/2,.03,.016,zr-zt-.04);
 const slope=(z0,y0,z1,y1,xx,mat,wid=.07,t=.05)=>{const len=Math.hypot(z1-z0,y1-y0),b=box(g,mat,xx,(y0+y1)/2,(z0+z1)/2,t,len,wid);b.rotation.x=Math.atan2(z1-z0,y1-y0);return b;};
 for(const s of [-1,1]){
  const xx=s*(cw/2-.04);slope(zf,.76,zt,top,xx,paint);slope(zb,.76,zr,top,xx,paint,.11);box(g,m.seam,xx,(.76+top)/2,zc+.06,.05,top-.76,.1);
  box(g,m.seam,s*(cw/2-.018),.8,(zf+zb)/2,.012,.02,zb-zf-.1);
 }
 // Two wipers parked on the cowl.
 for(const u of [-.32,.2]){const wiper=box(g,m.fitting,u,.79,zf-.018,.56,.014,.018);wiper.rotation.z=.14;}
 // Wheels: lathed tyres, spoked rims and hubs; underbody and exhaust between the shot boxes.
 box(g,m.under,0,.24,0,w*.9,.2,d*.9);cyl(g,m.fitting,.58,.22,back-.08,.035,.26,'z',.035,10);
 for(const s of [-1,1])for(const dz of [-wz,wz]){
  const wheel=new T.Group();wheel.position.set(s*w*.46,.31,dz);g.add(wheel);
  const tyre=new T.Mesh(m.tyre,m.rubber);tyre.castShadow=true;wheel.add(tyre);
  cyl(wheel,m.rim,0,0,0,.17,.12,'x',.17,14);cyl(wheel,m.seam,s*.061,0,0,.15,.006,'x',.15,14);cyl(wheel,m.chrome,s*.065,0,0,.05,.03,'x',.05,10);
  for(let k=0;k<5;k++){const a=k*Math.PI*2/5,sp=box(wheel,m.rim,s*.064,Math.cos(a)*.1,Math.sin(a)*.1,.02,.13,.035);sp.rotation.x=-a;}
 }
 // Cosmetic roof equipment: a rack with a jerrycan, or a station light bar and whip antenna.
 if(live.rack){for(const s of [-1,1])box(g,m.rack,s*.55,top+.06,(zt+zr)/2,.04,.04,zr-zt-.1);for(const zz of [zt+.1,(zt+zr)/2,zr-.1])box(g,m.rack,0,top+.04,zz,1.14,.03,.04);
  box(g,m.can,.2,top+.2,(zt+zr)/2+.25,.3,.26,.14);box(g,m.rack,.2,top+.35,(zt+zr)/2+.22,.06,.04,.08);
  box(g,m.rack,-.25,top+.12,(zt+zr)/2-.2,.5,.1,.5);}
 if(live.lightbar){box(g,m.bar,0,top+.07,zt+.22,cw-.4,.08,.16);cyl(g,m.rack,cw/2-.12,top+.55,zr-.15,.008,1.1,'y',.008,5);}
 return g;
}
export function desertSkyline(root,p,grove=false){
 if(grove)return;
 // Palms stand inside solid blocks and rise above the roofline; like wires they
 // are cosmetic for ballistics, so the trunk shares the leaves' flag.
 const leaf=new T.MeshStandardMaterial({color:0x657756,roughness:1,side:T.DoubleSide}),trunk=cosmetic(p.rust),ring=cosmetic(p.wornWood);leaf.userData.nonBallistic=true;
 for(const [x,z,h]of [[46,-2,15],[-47,6,14],[24,-50,14],[-40,-51,13]]){
  const g=new T.Group();g.position.set(x,0,z);root.add(g);cyl(g,trunk,0,h/2,0,.20,h,'y',.29,12);
  for(let y=.4;y<h-.4;y+=.55)cyl(g,ring,0,y,0,.225,.05,'y',.24,10);
  const positions=[];for(let f=0;f<11;f++){const a=f*Math.PI*2/11,dx=Math.cos(a),dz=Math.sin(a),sx=-dz,sz=dx,L=3.4+(f%3)*.4;
   for(let n=1;n<=12;n++){const t=n/12,r=L*t,y=h+Math.sin(t*Math.PI)*.9-t*t*1.3,prev=(n-1)/12,pr=L*prev,py=h+Math.sin(prev*Math.PI)*.9-prev*prev*1.3;
    for(const side of [-1,1]){const width=Math.sin(t*Math.PI)*.55;positions.push(dx*pr,py,dz*pr,dx*r,y,dz*r,dx*(r-.35)+sx*width*side,y-.1,dz*(r-.35)+sz*width*side);}
   }
  }const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.computeVertexNormals();g.add(new T.Mesh(geo,leaf));
 }
}
// Authored court features. Each one is drawn inside its shared solid: a basin is
// brim-full (water at the rim), a well is closed by a flush timber lid, planters
// hold only flush ground cover, and a tree trunk fills its slender shot box. Only
// the canopy above the trunk box is cosmetic, like wires and palms.
// Falling water, ripples, the well's winch and rope, and succulents are cosmetic too.
let foliage=null,foliageLight=null,water=null,stream=null,ripple=null,rope=null;
// A leaf cluster: an icosphere whose vertices are pushed in and out, so the crown has
// a ragged silhouette instead of a row of smooth balls.
function leafCluster(size,seed){const g=new T.IcosahedronGeometry(size,1),pos=g.attributes.position;for(let i=0;i<pos.count;i++){const k=.8+.4*Math.abs(Math.sin(seed*3.1+i*12.9898)*43758.5453%1);pos.setXYZ(i,pos.getX(i)*k,pos.getY(i)*(.7+.3*k),pos.getZ(i)*k);}g.computeVertexNormals();return g;}
function treeMaterials(p){
 if(!foliage){foliage=new T.MeshStandardMaterial({color:0x56653f,roughness:.92,flatShading:true});foliage.userData.nonBallistic=true;foliageLight=new T.MeshStandardMaterial({color:0x7d8a5a,roughness:.9,flatShading:true});foliageLight.userData.nonBallistic=true;}
 if(!water)water=new T.MeshStandardMaterial({color:0x2b5f66,roughness:.07,metalness:.2,emissive:0x07191b,emissiveIntensity:.3});
 if(!stream){stream=new T.MeshStandardMaterial({color:0xd4ecec,roughness:.05,metalness:.1,transparent:true,opacity:.55,depthWrite:false});stream.userData.nonBallistic=true;ripple=stream.clone();ripple.opacity=.32;ripple.userData.nonBallistic=true;rope=new T.MeshStandardMaterial({color:0xa58c62,roughness:1});rope.userData.nonBallistic=true;}
 if(!p.twig)p.twig=cosmetic(p.wornWood);
 if(!p.fitCopper)p.fitCopper=cosmetic(p.copper||p.metal);
 return {foliage,foliageLight,water,stream,ripple,rope,bark:p.wornWood,twig:p.twig,copper:p.fitCopper};
}
export function desertFeature(root,p,role,x,z,w,d,top,base,part='full'){
 const g=new T.Group();g.position.set(x,0,z);root.add(g);const h=top-base,m=treeMaterials(p),tile=p.blue;
 if(role==='basin'||role==='well'){
  const rim=role==='well'?.42:.34;
  for(const [sx,sz,ww,dd]of [[0,-(d-rim)/2,w,rim],[0,(d-rim)/2,w,rim],[-(w-rim)/2,0,rim,d-2*rim],[(w-rim)/2,0,rim,d-2*rim]])block(g,p.wornStone,sx,base+h/2,sz,ww,h,dd,1.2);
  // Glazed band and a moulded cap ring, both flush with the solid.
  for(const side of [-1,1]){box(g,tile,0,base+h*.55,side*(d/2+.006),w-.1,.22,.012);box(g,tile,side*(w/2+.006),base+h*.55,0,.012,.22,d-.1);}
  for(const [sx,sz,ww,dd]of [[0,-(d-rim)/2,w,rim],[0,(d-rim)/2,w,rim],[-(w-rim)/2,0,rim,d-2*rim],[(w-rim)/2,0,rim,d-2*rim]])box(g,p.trim,sx,top-.04,sz,ww,.08,dd);
  if(role==='basin')box(g,m.water,0,top-.035,0,w-2*rim,.05,d-2*rim);
  else{
   for(let u=-(w-2*rim)/2+.14;u<(w-2*rim)/2;u+=.3)box(g,p.wornWood,u,top-.04,0,.26,.06,d-2*rim);box(g,p.doorIron,0,top-.005,0,w-2*rim-.1,.02,.08);
   // Winch frame on the rim: two posts, a drum with a crank, the rope and a copper bucket resting on the lid.
   const px=w/2-rim/2;for(const sx of [-1,1]){box(g,m.twig,sx*px,top+.7,0,.11,1.4,.11);box(g,m.twig,sx*px,top+1.36,0,.16,.08,.16);}
   cyl(g,m.twig,0,top+1.18,0,.08,2*px-.1,'x',.08,10);for(const k of [-.3,0,.3])cyl(g,m.rope,k,top+1.18,0,.085,.12,'x',.085,10);
   box(g,m.twig,px+.12,top+1.18,0,.04,.04,.04);box(g,m.twig,px+.12,top+1.08,0,.03,.22,.03);box(g,m.twig,px+.12,top+.98,.07,.03,.03,.16);
   cyl(g,m.rope,.08,top+.66,.03,.012,1.04,'y',.012,5);cyl(g,m.copper,.08,top+.12,.03,.13,.22,'y',.11,12);
  }
  return;
 }
 if(role==='rill'){
  // Salsabil: a stone channel down the middle of the piazza steps, water at the lip.
  block(g,p.wornStone,0,(top+base)/2,0,w,h,d,1.2);box(g,p.trim,0,top-.04,0,w+.05,.08,d+.05);
  box(g,m.water,0,top-.025,0,w-.5,.04,d-.3);for(const side of [-1,1])box(g,tile,side*(w/2+.006),top-.26,0,.012,.2,d-.1);
  return;
 }
 if(role==='spout'){
  const r=.44;cyl(g,p.wornStone,0,(top+base)/2,0,r*.86,h,'y',r,8);cyl(g,p.trim,0,top-.06,0,r,.12,'y',r,8);
  // Four copper spouts above the basin water (the basin rim is 0.9 m), each with a
  // falling stream and two rings where it meets the surface.
  const pipeY=base+1.25,waterY=base+.92,tip=r*.86+.19;
  for(let a=0;a<4;a++){
   const ang=a*Math.PI/2,c=Math.cos(ang),sn=Math.sin(ang),pipe=new T.Mesh(new T.CylinderGeometry(.018,.025,.22,6),m.copper);pipe.rotation.z=Math.PI/2;pipe.rotation.y=-ang;pipe.position.set(c*(r*.86+.08),pipeY,sn*(r*.86+.08));g.add(pipe);
   const pts=[];for(let k=0;k<=8;k++){const t=k/8;pts.push(new T.Vector3(c*(tip+.32*t),pipeY-(pipeY-waterY)*t*t,sn*(tip+.32*t)));}
   const fall=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),8,.014,4,false),m.stream);fall.castShadow=false;g.add(fall);
   for(const rr of [.07,.15]){const ring=new T.Mesh(new T.TorusGeometry(rr,.005,3,12),m.ripple);ring.rotation.x=Math.PI/2;ring.position.set(c*(tip+.32),waterY+.006,sn*(tip+.32));g.add(ring);}
  }
  return;
 }
 if(role==='planter'){
  block(g,p.wornStone,0,(top+base-.1)/2,0,w,h-.1,d,1.2);box(g,p.trim,0,top-.05,0,w+.04,.1,d+.04);
  const soil=new T.MeshStandardMaterial({color:0x5a4634,roughness:1});box(g,soil,0,top-.02,0,w-.16,.04,d-.16);
  // A few low succulents in the soil, around the tree trunk when there is one.
  for(let i=0;i<5;i++){const a=i*1.26+x,rr=Math.min(w,d)*.3,s=new T.Mesh(new T.IcosahedronGeometry(.1+(i%3)*.035,0),i%2?m.foliageLight:m.foliage);s.position.set(Math.cos(a)*rr,top+.03,Math.sin(a)*rr);s.scale.set(1.3,.6,1.3);g.add(s);}
  return;
 }
 if(role==='trunk'){
  // Bark trunk inside its 0.32 m shot box, then a loose crown of leaf clusters. V39: the trunk
  // stays as the solid, inside a photographed palm; the crown is its fallback if the model fails.
  if(part!=='crown')cyl(g,m.bark,0,(top+base)/2,0,.12,h,'y',.155,7);
  if(part==='bark')return;
  const seed=Math.abs(Math.sin(x*12.9+z*78.2))*1000;
  // Olive-like crown: many small clusters in two tones, flattened and spread.
  for(let i=0;i<11;i++){
   const a=seed+i*2.39,r=i?.55+((i*37)%10)/10*.95:0,size=.5+((i*53)%10)/10*.38,s=new T.Mesh(leafCluster(size,seed+i),i%3?m.foliage:m.foliageLight);
   s.position.set(Math.cos(a)*r,top+.55+((i*29)%10)/10*1.05,Math.sin(a)*r);s.scale.set(1.15,.7,1.15);s.rotation.y=a;s.castShadow=true;s.receiveShadow=true;g.add(s);
  }
  for(let i=0;i<3;i++){const a=seed+i*2.1,b=new T.Mesh(new T.CylinderGeometry(.035,.06,1.1,5),m.twig);b.position.set(Math.cos(a)*.35,top+.35,Math.sin(a)*.35);b.rotation.set(Math.sin(a)*.7,0,Math.cos(a)*.7);g.add(b);}
 }
}
