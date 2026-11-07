import * as T from './vendor/three.module.js';
import {box,cyl,bevel} from './graphics.js?v=42.0';
import {cosmetic} from './trim-kit.js?v=42.0';
// FORGE plant dressing (V42). Everything here is cosmetic: on the floor, within 6 cm of a
// solid below head height, or well above it, and flagged so bullets ignore it. It runs
// before mergeStatic, so the whole layer costs a handful of draw calls.
const flagged=m=>{m.userData.nonBallistic=true;return m;};
const SIDES=[-1,1];
export function forgeDetailMaterials(p){
 const paint=(color,r=.8,m=0)=>flagged(new T.MeshStandardMaterial({color,roughness:r,metalness:m}));
 Object.assign(p,{heat:flagged(new T.MeshStandardMaterial({color:0x1a0a04,emissive:0xff4a10,emissiveIntensity:1.5,roughness:.6})),
  reliefConcrete:cosmetic(p.concrete),reliefSteel:cosmetic(p.steel),reliefDark:cosmetic(p.dark),reliefCopper:cosmetic(p.copper),reliefWhite:cosmetic(p.white),
  bridge:paint(0xa7b6b9,.5,.3),joint:paint(0x5a6062,.95),grate:paint(0x667477,.55,.4),accentN:paint(0x2f6fb5,.62),accentS:paint(0xd9701f,.62),
  plantBody:new T.MeshStandardMaterial({color:0x6f7f81,roughness:.62,metalness:.3}),plantDark:new T.MeshStandardMaterial({color:0x2c3a3f,roughness:.7,metalness:.25})});
}
function strut(root,material,a,b,width){const s=new T.Vector3(...a),e=new T.Vector3(...b),m=box(root,material,0,0,0,width,s.distanceTo(e),width);m.position.copy(s).add(e).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),e.sub(s).normalize());return m;}
// The central generator: recessed grilles over a glowing core, on the existing collision box.
export function generatorFaces(root,p,x,z,w,d,h,label,steps=false){
 for(const side of SIDES){
  const f=z+side*d/2;
  box(root,p.dark,x,h*.54,f+side*.012,w-.22,h-.2,.025);box(root,p.heat,x,.52,f+side*.028,w-.5,.46,.008);
  for(let i=-9;i<=9;i++)box(root,p.reliefSteel,x+i*.26,.52,f+side*.045,.11,.5,.03);
  box(root,p.reliefSteel,x,.27,f+side*.045,w-.4,.05,.03);box(root,p.reliefSteel,x,.77,f+side*.045,w-.4,.05,.03);
  label(root,'FORGE / CONTROLLO FLUSSO',x,.96,f+side*.045,2.9,.2,side>0?0:Math.PI,{background:'#344950',color:'#dfe3d4',font:68});
  if(steps)continue;const e=x+side*w/2;
  box(root,p.dark,e+side*.012,h*.54,z,.025,h-.2,d-.5);box(root,p.heat,e+side*.028,.56,z,.008,.5,d-.8);
  for(let i=-4;i<=4;i++)box(root,p.reliefSteel,e+side*.045,.56,z+i*.27,.03,.54,.11);
 }
}
// The riser that carries the pressure main: flanged, with a gauge at eye height.
export function pillarDress(root,p,x,z,h){
 for(const y of [1.3,2.05,3.2,4.35])cyl(root,p.reliefCopper,x,y,z,.47,.08,'y',.47,24);
 cyl(root,p.reliefSteel,x,h-.2,z,.62,.16,'y',.62,24);
 for(const side of SIDES){const g=z+side*.43;cyl(root,p.reliefDark,x,1.7,g,.17,.04,'z',.17,20);cyl(root,p.reliefWhite,x,1.7,g+side*.012,.14,.03,'z',.14,20);const n=box(root,p.reliefCopper,x,1.72,g+side*.03,.016,.11,.006);n.rotation.z=side*.7;}
}
// Slow steam off the main, above head height. Points move in the vertex shader; the time
// uniform only advances when the plume is actually drawn.
export function steam(root,spots){
 const per=14,seed=new Float32Array(spots.length*per*4),pos=new Float32Array(spots.length*per*3);
 spots.forEach((s,i)=>{for(let n=0;n<per;n++){const k=i*per+n;pos.set(s,k*3);seed.set([n/per,(n*7%per)/per-.5,(n*5%per)/per-.5,.8+(n%3)*.2],k*4);}});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('seed',new T.BufferAttribute(seed,4));g.boundingSphere=new T.Sphere(new T.Vector3(0,9,0),14);
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},height:{value:900}},vertexShader:`attribute vec4 seed;uniform float time,height;varying float a;void main(){float t=fract(seed.x+time*.055);vec3 p=position+vec3(seed.y*.5+t*.9,t*5.5,seed.z*.5-t*.5);vec4 v=modelViewMatrix*vec4(p,1.);a=smoothstep(0.,.12,t)*(1.-t);gl_Position=projectionMatrix*v;gl_PointSize=(1.1+t*3.4)*seed.w*height/max(.5,-v.z)*.55;}`,fragmentShader:`varying float a;void main(){float d=length(gl_PointCoord-.5)*2.;float s=smoothstep(1.,.15,d);gl_FragColor=vec4(.9,.92,.92,s*a*.17);}`});
 const points=new T.Points(g,m),size=new T.Vector2();points.raycast=()=>{};points.renderOrder=3;
 points.onBeforeRender=renderer=>{m.uniforms.time.value=performance.now()/1000;m.uniforms.height.value=renderer.getDrawingBufferSize(size).y;};
 root.add(points);return points;
}
function canvasPlane(root,width,depth,x,z,y,yaw,paint,px=512){
 const c=document.createElement('canvas');c.width=px;c.height=Math.max(32,Math.round(px*depth/width));paint(c.getContext?.('2d'),c.width,c.height);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;
 const m=new T.MeshStandardMaterial({map:t,roughness:.86,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});flagged(m);const g=new T.PlaneGeometry(width,depth);g.rotateX(-Math.PI/2);const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.rotation.y=yaw;mesh.receiveShadow=true;root.add(mesh);return mesh;
}
// Hazard chevrons at the two arch thresholds, as worn floor paint.
const hazard=(c,w,h)=>{if(!c)return;c.fillStyle='#2b2f30';c.fillRect(0,0,w,h);c.fillStyle='#b98f3f';for(let x=-h;x<w+h;x+=h*1.4){c.beginPath();c.moveTo(x,h);c.lineTo(x+h*.7,h);c.lineTo(x+h*1.4,0);c.lineTo(x+h*.7,0);c.fill();}c.fillStyle='rgba(60,62,62,.5)';for(let i=0;i<140;i++){const n=Math.abs(Math.sin(i*12.9898)*43758.5453)%1,q=Math.abs(Math.sin(i*78.233)*12543.17)%1;c.fillRect(n*w,q*h,2+n*14,1+q*4);}};
export function forgeFloor(root,p,arches){
 // Saw-cut joints every 4 m; they stop short of nothing because walls simply cover them.
 for(let u=-16;u<=16;u+=4){box(root,p.joint,u,.0018,0,.016,.0036,38);}
 for(let u=-18;u<=18;u+=4){box(root,p.joint,0,.0019,u,34,.0038,.016);}
 // Slot drains along the long walls and the hall fronts.
 for(const side of SIDES){box(root,p.joint,side*17.15,.002,0,.3,.004,38);for(let z=-18.8;z<19;z+=.4)box(root,p.grate,side*17.15,.0055,z,.26,.003,.06);
  for(const hall of SIDES)for(let x=9.4;x<14.7;x+=.4)box(root,p.grate,hall*x,.0055,side*7.28,.06,.003,.2);for(const hall of SIDES)box(root,p.joint,hall*12,.002,side*7.28,5.6,.004,.24);}
 for(const a of arches)for(const s of SIDES)canvasPlane(root,5,.7,a.x+s*1.15,a.z,.0062,Math.PI/2,hazard);
 // Soft oil and water stains from the plant; one shared map.
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext?.('2d');if(x?.createRadialGradient){for(const [cx,cy,r,a] of [[58,62,40,.2],[76,54,26,.2],[46,78,22,.18],[80,80,16,.16],[38,48,13,.14],[66,70,9,.18]]){const g=x.createRadialGradient(cx,cy,1,cx,cy,r);g.addColorStop(0,'rgba(26,24,20,'+a+')');g.addColorStop(.6,'rgba(26,24,20,'+a*.45+')');g.addColorStop(1,'rgba(26,24,20,0)');x.fillStyle=g;x.fillRect(0,0,128,128);}}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const m=flagged(new T.MeshStandardMaterial({map:t,transparent:true,depthWrite:false,roughness:.5,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6}));
 const pos=[],uv=[],idx=[],quads=[[-5.5,-9.6,2.6,1.7],[5.2,9.8,2.4,1.8],[-3.6,4.2,3.2,2],[3.4,-4.4,3,2.1],[-12.6,1.4,2.2,3.2],[12.8,-1.2,2.4,2.8],[-16,-11,1.4,3.4],[16.1,10.5,1.5,3],[0,-16.4,2.4,1.6],[0,16.6,2.2,1.5]];
 quads.forEach(([a,b,w,d],i)=>{const cs=Math.cos(a*b),sn=Math.sin(a*b);for(const [u,v] of [[-1,-1],[-1,1],[1,-1],[1,1]]){const lx=u*w/2,lz=v*d/2;pos.push(a+lx*cs-lz*sn,.0075,b+lx*sn+lz*cs);uv.push((u+1)/2,(v+1)/2);}const n=i*4;idx.push(n,n+1,n+2,n+2,n+1,n+3);});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const s=new T.Mesh(g,m);s.userData.keep=true;s.receiveShadow=true;root.add(s);
}
// Perimeter walls: pilasters over the cladding seams, a drip-edge coping, the service trunk.
export function forgeWallRelief(root,p){
 const skip=(u,keep)=>keep.some(k=>Math.abs(u-k)<.9);
 for(const side of SIDES){
  for(const u of [-12,-6,6,12])if(!skip(u,side<0?[-9]:[9]))box(root,p.reliefConcrete,u,4.75,side*(19.5-.175),.5,4.3,.35);
  for(const u of [-11.6,-5.8,5.8,11.6])if(!skip(u,side<0?[11]:[-7]))box(root,p.reliefConcrete,side*(17.5-.175),4.75,u,.35,4.3,.5);
  box(root,p.reliefWhite,0,6.84,side*(19.5-.05),35,.14,.1);box(root,p.reliefWhite,side*(17.5-.05),6.84,0,.1,.14,39);
  // Straight ventilation trunk with seam ribs and hangers, broken by the station plate.
  for(const run of SIDES){box(root,p.reliefSteel,run*10.45,5.2,side*19.17,10.5,.42,.5);
   for(let u=5.2;u<=15.75;u+=1.72){box(root,p.reliefDark,run*u,5.2,side*19.17,.05,.47,.55);box(root,p.reliefSteel,run*u,6.1,side*19.33,.05,1.4,.05);}}
 }
}
// Deep frame, sill and mullion on a hall window; depth grows only above head height.
export function hallWindow(root,p,x,y,z,side){
 const o=side*.07;for(const s of SIDES){box(root,p.reliefSteel,x+o,y+s*.87,z,.14,.08,1.88);box(root,p.reliefSteel,x+o,y,z+s*.9,.14,1.8,.08);}
 box(root,p.reliefWhite,x+side*.1,y-.95,z,.2,.07,2.05);box(root,p.reliefSteel,x+side*.05,y,z,.03,1.66,.05);
}
// The service bridge as a lighter truss that lands on the hall roofs.
export function serviceBridge(root,p,z,roof){
 box(root,p.bridge,0,8.5,z,23,.16,1.45);
 for(const side of SIDES){box(root,p.reliefCopper,0,9.3,z+side*.73,23,.065,.065);for(let x=-11;x<=11;x+=1.38)box(root,p.reliefCopper,x,8.9,z+side*.73,.05,.8,.05);
  box(root,p.bridge,0,7.86,z+side*.6,21.2,.09,.09);
  for(let x=-10.5;x<10.4;x+=1.5){strut(root,p.bridge,[x,8.42,z+side*.6],[x+.75,7.88,z+side*.6],.05);strut(root,p.bridge,[x+.75,7.88,z+side*.6],[x+1.5,8.42,z+side*.6],.05);}}
 for(let x=-10.5;x<=10.5;x+=3)box(root,p.bridge,x,7.86,z,.06,.06,1.2);
 for(const end of SIDES){const zz=Math.sign(z)*7.72;box(root,p.bridge,end*11.1,(roof+8.42)/2,zz,.5,8.42-roof,.34);box(root,p.bridge,end*11.1,roof+.05,zz,1.1,.1,.7);strut(root,p.bridge,[end*10,8.4,z],[end*11.05,roof+.1,zz],.1);}
}
// Plant on the cover collision boxes: a solid body filling the box, details within 5 cm.
export function plantCover(root,p,x,z,w,d,h,accent){
 const drums=h<1.5,long=w>d*2;
 bevel(root,drums?p.plantDark:p.plantBody,x,h/2,z,w,h,d,.035);
 const faces=[[1,0],[-1,0],[0,1],[0,-1]];
 box(root,accent,x,h-.07,z,w+.012,.1,d+.012);
 if(drums){for(const s of SIDES){cyl(root,p.reliefCopper,x+s*(w/2+.018),.72,z,.62,.03,'x',.62,28);cyl(root,p.reliefDark,x+s*(w/2+.04),.72,z,.3,.02,'x',.3,20);for(let n=0;n<8;n++){const a=n*Math.PI/4;box(root,p.reliefSteel,x+s*(w/2+.038),.72+Math.sin(a)*.46,z+Math.cos(a)*.46,.012,.05,.05);}}return;}
 if(long){for(const s of SIDES){const f=z+s*d/2;
   cyl(root,p.reliefCopper,x,.5,f+s*.008,.05,w-.25,'x',.05,10);cyl(root,p.reliefCopper,x,1.32,f+s*.008,.05,w-.25,'x',.05,10);
   for(const u of [-1,0,1]){const t=x+u*.98;box(root,p.reliefDark,t,.91,f+s*.012,.46,.72,.02);cyl(root,p.reliefSteel,t,.91,f+s*.03,.05,.02,'z',.05,12);const wheel=new T.Mesh(new T.TorusGeometry(.17,.018,6,20),p.reliefCopper);wheel.position.set(t,.91,f+s*.03);root.add(wheel);box(root,p.reliefCopper,t,.91,f+s*.032,.34,.018,.012);}}
  return;}
 // Transformer: radiator fins on the long faces, a service plate on the short ones.
 for(const [nx,nz] of faces){const along=nz?w:d,count=Math.floor((along-.5)/.17);
  if(nz)for(let i=0;i<count;i++)box(root,p.reliefDark,x-along/2+.3+i*.17,.95,z+nz*(d/2+.022),.07,1.4,.044);
  else{box(root,p.reliefDark,x+nx*(w/2+.012),1.0,z,.024,1.1,d-.7);for(const a of SIDES)for(const b of SIDES)cyl(root,p.reliefSteel,x+nx*(w/2+.028),1+b*.48,z+a*(d/2-.42),.022,.012,'x',.022,8);}}
}
// Spillway sheets in the central dam bays, one draw call with a scrolling streak map.
export function spillway(root,bays){
 const c=document.createElement('canvas');c.width=64;c.height=256;const x=c.getContext?.('2d');if(x){x.fillStyle='#b9cbd0';x.fillRect(0,0,64,256);for(let i=0;i<260;i++){const n=Math.abs(Math.sin(i*12.9898)*43758.5453)%1,q=Math.abs(Math.sin(i*78.233)*12543.17)%1;x.fillStyle=i%3?'rgba(236,244,246,.5)':'rgba(120,146,154,.4)';x.fillRect(n*64,q*256,1+n*3,18+q*70);}}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(1.2,3);
 const m=new T.MeshStandardMaterial({map:t,roughness:.3,metalness:.05,transparent:true,opacity:.92,envMapIntensity:.6});flagged(m);
 const pos=[],uv=[],idx=[];bays.forEach(([x0,z0,width,top,yaw],i)=>{const cx=Math.cos(yaw),sx=Math.sin(yaw);for(const [a,b] of [[-1,1],[1,1],[-1,0],[1,0]]){pos.push(x0+a*width/2*cx,top*b,z0-a*width/2*sx);uv.push((a+1)/2,b);}idx.push(i*4,i*4+2,i*4+1,i*4+1,i*4+2,i*4+3);});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 const mesh=new T.Mesh(g,m);mesh.userData.keep=true;mesh.onBeforeRender=()=>{t.offset.y=performance.now()/1000*.42%1;};root.add(mesh);return mesh;
}
