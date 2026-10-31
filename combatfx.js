import * as THREE from './vendor/three.module.js';
import {WALLS,ARCHES,MAPS,ACTIVE_MAP,groundHeight,wallDistance} from './shared.js?v=38.2';
import {markMaterial,markSize} from './impact-marks.js?v=38.2';
// Procedural textures are generated from typed arrays: no canvas, no image files.
function hash(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function dataTexture(size,fill,srgb=true){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const c=fill((x+.5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;for(let k=0;k<4;k++)data[i+k]=Math.max(0,Math.min(255,Math.round(c[k]*255)));}
 const t=new THREE.DataTexture(data,size,size);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;
}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const TEXTURES={};
function textures(){
 if(TEXTURES.puff)return TEXTURES;
 TEXTURES.puff=dataTexture(64,(x,y)=>{const r=Math.hypot(x,y),n=noise(x*3+7,y*3+3)*.6+noise(x*7,y*7)*.4;return [1,1,1,Math.max(0,1-smooth(.15,1,r+(.5-n)*.45))*.9];});
 TEXTURES.flash=dataTexture(128,(x,y)=>{const r=Math.hypot(x,y),a=Math.atan2(y,x),spikes=Math.pow(Math.abs(Math.cos(a*2.5)),18)*(1-smooth(0,1,r))+Math.pow(Math.abs(Math.cos(a*3.5+.4)),30)*(1-smooth(0,.8,r))*.7,core=Math.exp(-r*r*18),glow=Math.exp(-r*r*4)*.35,v=Math.min(1,core+spikes*(.6+.4*noise(a*6,r*9))+glow);return [1,.9-.2*(1-core),.7-.35*(1-core),v];});
 TEXTURES.petal=dataTexture(64,(x,y)=>{const along=(y+1)/2,w=Math.abs(x)/(.16+.84*Math.sin(Math.PI*Math.min(1,along*1.1))**.7+.001),v=Math.max(0,1-w)*smooth(0,.15,along)*(1-smooth(.55,1,along))*(.7+.3*noise(x*5,y*9));return [1,.82,.55,v];});
 // Bullet holes, scorch and burn marks live in impact-marks.js (colour + normal maps).
 return TEXTURES;
}
const DUST={sahra:new THREE.Color(.74,.64,.5),caldera:new THREE.Color(.62,.6,.56),forge:new THREE.Color(.6,.6,.58)};
// The two pooled flash lights live in the arena scene so shader light counts never change mid-match.
export function createFlashLights(){const local=new THREE.PointLight(0xffc98a,0,10,2),remote=new THREE.PointLight(0xffcf96,0,12,2);local.castShadow=remote.castShadow=false;return {local,remote,localAge:1,remoteAge:1,localPeak:0,remotePeak:0,remoteSpan:.06};}
// Star, petals and core randomised per shot; additive and unlit like a real flash.
export function dressMuzzleFlash(flash,scale=1){
 if(!flash||flash.userData.dressed)return;flash.userData.dressed=true;const t=textures();
 const star=new THREE.Mesh(new THREE.PlaneGeometry(.15*scale,.15*scale),new THREE.MeshBasicMaterial({map:t.flash,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,color:new THREE.Color(1.6,1.25,.85)}));
 const petalMaterial=new THREE.MeshBasicMaterial({map:t.petal,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,color:new THREE.Color(1.4,1.05,.7)});
 const petalGeometry=new THREE.PlaneGeometry(.075*scale,.24*scale);petalGeometry.rotateX(-Math.PI/2);petalGeometry.translate(0,0,-.12*scale);
 const petals=[0,1].map(i=>{const m=new THREE.Mesh(petalGeometry,petalMaterial);m.rotation.z=i*Math.PI/2;return m;});
 star.position.z=-.012;for(const c of flash.children){c.scale.multiplyScalar(.7);}flash.add(star,...petals);
 flash.userData.flicker=()=>{star.rotation.z=Math.random()*Math.PI*2;star.scale.setScalar(.8+Math.random()*.55);petals.forEach((p,i)=>{p.rotation.z=i*Math.PI/2+(Math.random()-.5)*.6;p.scale.set(.75+Math.random()*.5,1,.6+Math.random()*.8);});};
}
export class CombatFX{
 constructor(scene){this.scene=scene;this.marks=[];this.particles=[];this.trails=[];this.puffs=[];this.sparkList=[];this.lights=null;this.trailGeo=new THREE.CylinderGeometry(1,1,1,6);this.trailMat=new THREE.MeshBasicMaterial({color:0xffdeb0,transparent:true,opacity:.32,depthWrite:false,toneMapped:false});this.coreMat=new THREE.MeshBasicMaterial({color:0xfff5df,transparent:true,opacity:.65,depthWrite:false,toneMapped:false});
  const t=textures();this.markGeo=new THREE.PlaneGeometry(1,1);
  // V31 marks: colour and normal maps per material, a pool deep enough for a whole round.
  this.markMats={};for(const kind of ['stone','sand','metal','wood','blood','scorch','burn'])this.markMats[kind]=markMaterial(kind);this.markMat=this.markMats.stone;
  this.chipGeo=new THREE.IcosahedronGeometry(.013,0);this.splinterGeo=new THREE.BoxGeometry(.006,.006,.04);this.dropGeo=new THREE.IcosahedronGeometry(.008,0);
  this.chipMats={stone:new THREE.MeshStandardMaterial({color:0xb4a790,roughness:1}),sand:new THREE.MeshStandardMaterial({color:0xc4ae8a,roughness:1}),wood:new THREE.MeshStandardMaterial({color:0x8a6a45,roughness:.95}),metal:new THREE.MeshStandardMaterial({color:0x8d9493,roughness:.5,metalness:.7}),blood:new THREE.MeshStandardMaterial({color:0x5a0a0a,roughness:.35})};this.chipMat=this.chipMats.stone;
  this.casingGeo=new THREE.CylinderGeometry(.0045,.0045,.026,8);this.casingMat=new THREE.MeshStandardMaterial({color:0xc9a55a,metalness:.85,roughness:.32});
  this.freeTrails=Array.from({length:64},()=>{const root=new THREE.Group(),outer=new THREE.Mesh(this.trailGeo,this.trailMat),core=new THREE.Mesh(this.trailGeo,this.coreMat);root.add(outer,core);return {root,outer,core,start:new THREE.Vector3(),end:new THREE.Vector3(),dir:new THREE.Vector3()};});
  this.freeParticles=Array.from({length:128},()=>({m:new THREE.Mesh(this.chipGeo,this.chipMat),v:new THREE.Vector3(),spin:new THREE.Vector3()}));
  this.freeMarks=Array.from({length:240},()=>new THREE.Mesh(this.markGeo,this.markMat));
  this.freePuffs=Array.from({length:72},()=>({s:new THREE.Sprite(new THREE.SpriteMaterial({map:t.puff,transparent:true,depthWrite:false,opacity:0})),v:new THREE.Vector3()}));
  this.glowMaterial=new THREE.SpriteMaterial({map:t.flash,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:new THREE.Color(3,2.2,1.4)});
  this.freeGlows=Array.from({length:8},()=>({s:new THREE.Sprite(this.glowMaterial.clone())}));this.glows=[];
  const sparkCount=96;this.sparkPositions=new Float32Array(sparkCount*6);this.sparkGeometry=new THREE.BufferGeometry();this.sparkGeometry.setAttribute('position',new THREE.BufferAttribute(this.sparkPositions,3));this.sparkGeometry.setDrawRange(0,0);
  this.sparkMesh=new THREE.LineSegments(this.sparkGeometry,new THREE.LineBasicMaterial({color:new THREE.Color(4,2.2,.9),transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending}));this.sparkMesh.frustumCulled=false;
  this.freeSparks=Array.from({length:sparkCount},()=>({p:new THREE.Vector3(),v:new THREE.Vector3(),life:0}));
  this.start=new THREE.Vector3();this.end=new THREE.Vector3();this.delta=new THREE.Vector3();this.normal=new THREE.Vector3();this.up=new THREE.Vector3(0,1,0);this.front=new THREE.Vector3(0,0,1);this.work=new THREE.Vector3();this.spin=new THREE.Quaternion();
 }
 releaseTrail(t){t.root.removeFromParent();this.freeTrails.push(t);}
 releaseParticle(p){p.m.removeFromParent();this.freeParticles.push(p);}
 particle(casing=false,kind='stone'){const p=this.freeParticles.pop()||this.particles.shift();p.m.removeFromParent();p.m.geometry=casing?this.casingGeo:kind==='wood'?this.splinterGeo:kind==='blood'?this.dropGeo:this.chipGeo;p.m.material=casing?this.casingMat:this.chipMats[kind]||this.chipMat;p.m.rotation.set(Math.random()*6,Math.random()*6,0);p.m.scale.setScalar(casing?1:.7+Math.random()*.7);p.spin.set((Math.random()-.5)*30,(Math.random()-.5)*30,(Math.random()-.5)*30);p.casing=casing;p.bounces=0;p.ground=null;this.particles.push(p);this.scene.add(p.m);return p;}
 puff(position,{color,size=.3,grow=.6,life=.9,opacity=.45,velocity=null,rise=.15,drag=2.2}={}){
  const p=this.freePuffs.pop()||this.puffs.shift();p.s.removeFromParent();p.s.position.copy(position);p.s.material.color.copy(color||DUST[ACTIVE_MAP]||DUST.caldera);p.s.material.rotation=Math.random()*Math.PI*2;p.s.material.opacity=opacity;
  Object.assign(p,{age:0,life,size,grow,opacity,rise,drag});p.v.copy(velocity||this.work.set(0,0,0));p.s.scale.setScalar(size);this.scene.add(p.s);this.puffs.push(p);return p;
 }
 glow(position,{size=1,life=.08,color=null}={}){const g=this.freeGlows.pop()||this.glows.shift();g.s.removeFromParent();g.s.position.copy(position);g.s.material.color.copy(color||this.glowMaterial.color);g.s.material.opacity=1;Object.assign(g,{age:0,life,size});g.s.scale.setScalar(size);this.scene.add(g.s);this.glows.push(g);}
 spark(position,velocity,life){if(!this.sparkMesh.parent)this.scene.add(this.sparkMesh);const s=this.freeSparks.pop()||this.sparkList.shift();s.p.copy(position);s.v.copy(velocity);s.life=s.max=life;this.sparkList.push(s);}
 // Cosmetic streaks follow the already-resolved, wall-clipped hitscan. They
 // never decide damage or continue past the actual impact.
 shot(e,{local=false,camera,muzzle}={}){
  if(!Array.isArray(e.from)||!Array.isArray(e.to)||e.weapon===5)return;
  if(!e.from.every(Number.isFinite)||!e.to.every(Number.isFinite))return;
  const start=this.start.set(...e.from),end=this.end.set(...e.to),ray=this.delta.subVectors(end,start),distance=ray.length();if(distance<.15)return;
  ray.normalize();
  if(local&&camera&&muzzle){this.muzzleWorld(camera,muzzle,start);}
  else {start.addScaledVector(ray,Math.min(.5,distance*.15));start.y-=.12;}
  const delta=this.delta.subVectors(end,start),length=delta.length();if(length<.05)return;
  const trail=this.freeTrails.pop()||this.trails.shift();trail.root.removeFromParent();trail.start.copy(start);trail.end.copy(end);trail.dir.copy(delta).divideScalar(length);
  trail.outer.scale.set(e.weapon===4?.005:.0035,1,e.weapon===4?.005:.0035);trail.core.scale.set(.0014,1,.0014);
  trail.root.quaternion.setFromUnitVectors(this.up,trail.dir);this.scene.add(trail.root);
  Object.assign(trail,{length,age:0,speed:e.weapon===4?900:650,span:e.weapon===4?1.65:1});
  this.trails.push(trail);this.placeTrail(trail,0);
 }
 muzzleWorld(camera,muzzle,target){muzzle.updateWorldMatrix(true,false);muzzle.getWorldPosition(target);camera.updateMatrixWorld();return target.applyMatrix4(camera.matrixWorld);}
 placeTrail(t,dt){
  t.age+=dt;const head=Math.min(t.length,.5+t.age*t.speed),tail=Math.max(0,head-t.span),visible=Math.max(.01,head-tail);
  t.root.position.copy(t.start).addScaledVector(t.dir,(head+tail)/2);t.root.scale.y=visible;const fade=Math.max(0,Math.min(1,1-(t.age-t.length/t.speed)/.025));t.root.scale.x=t.root.scale.z=fade;
 }
 // Classify the struck surface from the same shared solids used by collision and hitscan.
 surface(point,normal){
  const map=MAPS[ACTIVE_MAP]||{};if(normal.y>.7&&point[1]<=groundHeight(point[0],point[2])+.05)return ACTIVE_MAP==='sahra'?'sand':'stone';
  for(const b of map.movementBoxes||[]){const c=Math.cos(b.yaw||0),s=Math.sin(b.yaw||0),dx=point[0]-b.x,dz=point[2]-b.z;if(Math.abs(c*dx-s*dz)<b.w/2+.06&&Math.abs(s*dx+c*dz)<b.d/2+.06&&Math.abs(point[1]-b.y)<b.h/2+.06)return 'wood';}
  for(const c of map.ballisticCylinders||[])if(Math.abs(point[0]-c.x)<=c.length/2+.05&&Math.hypot(point[1]-c.y,point[2]-c.z)<=c.radius+.08)return 'metal';
  for(const b of map.ballisticBoxes||[])if(Math.abs(point[0]-b.x)<=b.w/2+.05&&Math.abs(point[1]-b.y)<=b.h/2+.05&&Math.abs(point[2]-b.z)<=b.d/2+.05)return /metal|copper|blue|iron/.test(b.material||'')?'metal':/wood/.test(b.material||'')?'wood':'stone';
  for(const w of WALLS)if(Math.abs(point[0]-w[0])<=w[2]/2+.05&&Math.abs(point[2]-w[1])<=w[3]/2+.05&&point[1]<=w[4]+.05&&point[1]>=(w[6]??0)-.05){const k=w[5];if(ACTIVE_MAP==='sahra')return [1,3,6].includes(k)?'wood':[2,7].includes(k)?'metal':'stone';return [1,2].includes(k)?'metal':'stone';}
  return 'stone';
 }
 // Normal of the struck face from every shared solid: walls, arches, the yawed crates,
 // doors and ballistic boxes, the pipe cylinders and the ground. Falls back to the
 // reversed ray so a mark never floats edge-on.
 surfaceNormal(point,dir){
  const normal=this.normal.copy(dir).negate(),map=MAPS[ACTIVE_MAP]||{};let best=.08;
  const face=(mn,mx,yaw,cx,cz)=>{let px=point[0],pz=point[2];if(yaw){const c=Math.cos(yaw),s=Math.sin(yaw),dx=point[0]-cx,dz=point[2]-cz;px=cx+c*dx-s*dz;pz=cz+s*dx+c*dz;}const p=[px,point[1],pz];
   for(let i=0;i<3;i++)for(const sign of [-1,1]){const d=Math.abs(p[i]-(sign<0?mn[i]:mx[i]));if(d<best&&[0,1,2].every(k=>k===i||(p[k]>=mn[k]-.02&&p[k]<=mx[k]+.02))){best=d;normal.set(0,0,0);normal.setComponent(i,sign);if(yaw&&i!==1){const c=Math.cos(-yaw),s=Math.sin(-yaw),nx=normal.x,nz=normal.z;normal.x=c*nx-s*nz;normal.z=s*nx+c*nz;}}}};
  for(const w of WALLS)face([w[0]-w[2]/2,w[6]??0,w[1]-w[3]/2],[w[0]+w[2]/2,w[4],w[1]+w[3]/2]);
  for(const a of ARCHES||[]){const along=a.axis==='z'?2:0,across=a.axis==='z'?0:2,mn=[0,a.spring,0],mx=[0,a.height,0],center=[a.x,0,a.z];mn[along]=center[along]-a.depth/2;mx[along]=center[along]+a.depth/2;mn[across]=center[across]-a.width/2;mx[across]=center[across]+a.width/2;face(mn,mx);}
  for(const b of map.ballisticBoxes||[])face([b.x-b.w/2,b.y-b.h/2,b.z-b.d/2],[b.x+b.w/2,b.y+b.h/2,b.z+b.d/2],b.yaw,b.x,b.z);
  for(const b of map.movementBoxes||[])face([b.x-b.w/2,(b.y??b.h/2)-b.h/2,b.z-b.d/2],[b.x+b.w/2,(b.y??b.h/2)+b.h/2,b.z+b.d/2],b.yaw,b.x,b.z);
  for(const c of map.ballisticCylinders||[]){const dy=point[1]-c.y,dz=point[2]-c.z,r=Math.hypot(dy,dz),d=Math.abs(r-c.radius);if(d<best&&Math.abs(point[0]-c.x)<=c.length/2+.02&&r>.001){best=d;normal.set(0,dy/r,dz/r);}}
  if(best===.08&&Math.abs(point[1]-groundHeight(point[0],point[2]))<.06)normal.set(0,1,0);return normal;}
 // The arena's surface probe (set after the map builds) seats a mark on the rendered skin.
 setProbe(probe){this.probe=probe||null;}
 decal(position,normal,material,size){const mark=this.freeMarks.pop()||this.marks.shift();mark.removeFromParent();mark.material=this.markMats[material]||this.markMat;if(this.probe)mark.position.copy(this.probe(position,normal));else mark.position.copy(position).addScaledVector(normal,.005);mark.quaternion.setFromUnitVectors(this.front,normal);mark.quaternion.multiply(this.spin.setFromAxisAngle(this.front,Math.random()*Math.PI*2));mark.scale.setScalar(size);this.scene.add(mark);this.marks.push(mark);return mark;}
 impact(point,direction){
  const pos=new THREE.Vector3(...point),dir=new THREE.Vector3(...direction).normalize(),normal=this.surfaceNormal(point,dir).clone(),material=this.surface(point,normal);
  this.decal(pos,normal,material,markSize(material));
  const chips=material==='metal'?0:3;
  for(let n=0;n<chips;n++){const p=this.particle(false,material);p.m.position.copy(pos).addScaledVector(normal,.03);p.v.copy(normal).multiplyScalar(.9+Math.random()*1.4);p.v.x+=(Math.random()-.5)*1.1;p.v.y+=Math.random()*1.3;p.v.z+=(Math.random()-.5)*1.1;p.life=.3+Math.random()*.35;}
  if(material==='metal'){const reflect=this.work.copy(dir).reflect(normal);for(let n=0;n<7;n++)this.spark(pos.clone().addScaledVector(normal,.01),reflect.clone().multiplyScalar(2.5+Math.random()*5).add(new THREE.Vector3((Math.random()-.5)*3,(Math.random()-.2)*3,(Math.random()-.5)*3)),.12+Math.random()*.22);this.puff(pos.clone().addScaledVector(normal,.04),{color:new THREE.Color(.55,.56,.56),size:.08,grow:.35,life:.45,opacity:.3,velocity:normal.clone().multiplyScalar(.4)});}
  else{const ground=material==='sand';const count=ground?3:2;for(let n=0;n<count;n++)this.puff(pos.clone().addScaledVector(normal,.05+n*.03),{size:ground?.12:.08,grow:ground?.9:.55,life:.8+Math.random()*.5,opacity:ground?.5:.42,velocity:normal.clone().multiplyScalar((ground?.5:.8)+Math.random()*.5).add(new THREE.Vector3((Math.random()-.5)*.3,ground?.35+Math.random()*.4:.1,(Math.random()-.5)*.3)),rise:ground?.05:.12,color:material==='wood'?new THREE.Color(.55,.45,.33):undefined});}
  return material;
 }
 // HE blast scorches the ground; a burnt-out fire leaves its black patch behind.
 scorch(point){if(!Array.isArray(point)||!point.every(Number.isFinite))return;const g=groundHeight(point[0],point[2]);if(point[1]-g>2.5)return;this.decal(new THREE.Vector3(point[0],g+.006,point[2]),new THREE.Vector3(0,1,0),'scorch',markSize('scorch'));}
 burn(point){if(!Array.isArray(point)||!point.every(Number.isFinite))return;this.decal(new THREE.Vector3(point[0],groundHeight(point[0],point[2])+.005,point[2]),new THREE.Vector3(0,1,0),'burn',markSize('burn'));}
 blood(point,direction=null,headshot=false){
  if(!Array.isArray(point)||!point.every(Number.isFinite))return;const pos=new THREE.Vector3(...point),dir=Array.isArray(direction)?new THREE.Vector3(...direction).normalize():new THREE.Vector3(0,0,-1);
  const red=new THREE.Color(.2,.012,.012);for(let n=0;n<(headshot?3:2);n++)this.puff(pos.clone().addScaledVector(dir,.05+n*.05),{color:red,size:headshot?.14:.1,grow:headshot?.9:.6,life:.3+Math.random()*.16,opacity:.48,velocity:dir.clone().multiplyScalar(.7+Math.random()*.5),rise:-.25,drag:4});
  for(let n=0;n<4;n++){const p=this.particle(false,'blood');p.m.position.copy(pos);p.v.copy(dir).multiplyScalar(1.5+Math.random()*2).add(new THREE.Vector3((Math.random()-.5)*1.2,Math.random()*.8,(Math.random()-.5)*1.2));p.life=.5+Math.random()*.3;}
  const reach=wallDistance(point,dir.toArray(),2.2);
  if(reach<2.2){const at=pos.clone().addScaledVector(dir,reach);this.decal(at,this.surfaceNormal(at.toArray(),dir).clone(),'blood',.28+Math.random()*.3+(headshot?.15:0));}
  else{const g=groundHeight(point[0]+dir.x*.7,point[2]+dir.z*.7);if(point[1]-g<2)this.decal(new THREE.Vector3(point[0]+dir.x*.7,g+.004,point[2]+dir.z*.7),new THREE.Vector3(0,1,0),'blood',.35+Math.random()*.3);}
 }
 // The local muzzle lights nearby walls for a frame or two; the barrel exhales a thin wisp.
 localMuzzle(camera,muzzle,weapon=3){
  if(!muzzle||weapon===5)return;muzzle.userData.flicker?.();const at=this.muzzleWorld(camera,muzzle,new THREE.Vector3());
  if(this.lights){const l=this.lights;l.local.position.copy(at);l.localAge=0;l.localPeak=[16,13,22,19,30][weapon]??18;}
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  this.puff(at.clone().addScaledVector(forward,.05),{color:new THREE.Color(.72,.72,.7),size:.05,grow:.32,life:.75+Math.random()*.3,opacity:.14,velocity:forward.multiplyScalar(.45).add(new THREE.Vector3(0,.12,0)),rise:.25,drag:1.6});
 }
 remoteMuzzle(from,to){
  if(!this.lights||!Array.isArray(from))return;const l=this.lights,at=new THREE.Vector3(...from);if(Array.isArray(to)){const d=new THREE.Vector3(...to).sub(at).normalize();at.addScaledVector(d,.55);}at.y-=.1;
  if(l.remoteAge<.03&&l.remotePeak>20)return;l.remote.color.set(0xffcf96);l.remote.position.copy(at);l.remoteAge=0;l.remotePeak=20;l.remoteSpan=.06;this.glow(at,{size:.45+Math.random()*.25,life:.05});
 }
 flashBurst(point){if(!Array.isArray(point))return;const at=new THREE.Vector3(...point);if(this.lights){const l=this.lights;l.remote.color.set(0xf2f6ff);l.remote.position.copy(at);l.remoteAge=0;l.remotePeak=160;l.remoteSpan=.16;}this.glow(at,{size:3.2,life:.22,color:new THREE.Color(4,4,4.2)});this.puff(at,{color:new THREE.Color(.8,.8,.8),size:.4,grow:1.6,life:2.4,opacity:.35,rise:.12});}
 explosion(point){
  if(!Array.isArray(point))return;const at=new THREE.Vector3(...point);
  if(this.lights){const l=this.lights;l.remote.color.set(0xffa25a);l.remote.position.copy(at).y+=1;l.remoteAge=0;l.remotePeak=900;l.remoteSpan=.5;}
  for(let n=0;n<5;n++)this.glow(at.clone().add(new THREE.Vector3((Math.random()-.5)*1.5,.4+Math.random()*1.2,(Math.random()-.5)*1.5)),{size:3+Math.random()*3,life:.35+Math.random()*.25,color:new THREE.Color(5,2.6,.9)});
  for(let n=0;n<16;n++)this.puff(at.clone().add(new THREE.Vector3((Math.random()-.5)*2,.3+Math.random()*1.5,(Math.random()-.5)*2)),{color:new THREE.Color(.22,.2,.19),size:.8+Math.random()*.6,grow:4+Math.random()*3,life:3+Math.random()*2.5,opacity:.7,velocity:new THREE.Vector3((Math.random()-.5)*3,1.5+Math.random()*3,(Math.random()-.5)*3),rise:.6,drag:.9});
  for(let n=0;n<14;n++){const p=this.particle(false,ACTIVE_MAP==='sahra'?'sand':'stone');p.m.position.copy(at).y+=.3;p.v.set((Math.random()-.5)*12,4+Math.random()*8,(Math.random()-.5)*12);p.life=1.2+Math.random();p.m.scale.setScalar(1.5+Math.random()*2);}
  for(let n=0;n<24;n++)this.spark(at.clone().add(new THREE.Vector3(0,.4,0)),new THREE.Vector3((Math.random()-.5)*18,3+Math.random()*12,(Math.random()-.5)*18),.4+Math.random()*.6);
 }
 casing(camera){const p=this.particle(true);p.m.position.set(.22,-.17,-.42).applyMatrix4(camera.matrixWorld);p.v.set(1.4+Math.random()*.5,1+Math.random()*.4,-.2).applyQuaternion(camera.quaternion);p.life=2.2;}
 update(dt){
  for(let i=this.trails.length-1;i>=0;i--){const t=this.trails[i];this.placeTrail(t,dt);if(t.age>t.length/t.speed+.025){this.releaseTrail(t);this.trails.splice(i,1);}}
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;p.v.y-=9.8*dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=dt*p.spin.x;p.m.rotation.y+=dt*p.spin.y;p.m.rotation.z+=dt*p.spin.z;
   const floor=groundHeight(p.m.position.x,p.m.position.z)+(p.casing?.0045:.006);
   if(p.m.position.y<floor){p.m.position.y=floor;if(p.casing&&p.bounces<3){p.bounces++;p.v.multiplyScalar(.38);p.v.y=Math.abs(p.v.y)*.45+.2/(p.bounces+1);p.spin.multiplyScalar(.5);}else{p.v.set(0,0,0);p.spin.set(0,0,0);if(p.casing)p.m.rotation.x=Math.PI/2;}}
   if(p.life<=0){this.releaseParticle(p);this.particles.splice(i,1);}}
  for(let i=this.puffs.length-1;i>=0;i--){const p=this.puffs[i];p.age+=dt;const u=p.age/p.life;if(u>=1){p.s.removeFromParent();this.freePuffs.push(p);this.puffs.splice(i,1);continue;}p.v.multiplyScalar(Math.exp(-p.drag*dt));p.v.y+=p.rise*dt;p.s.position.addScaledVector(p.v,dt);p.s.scale.setScalar(p.size+p.grow*(1-Math.pow(1-u,2.2)));p.s.material.opacity=p.opacity*(1-u)*(1-u)*Math.min(1,p.age/.04);p.s.material.rotation+=dt*.3;}
  for(let i=this.glows.length-1;i>=0;i--){const g=this.glows[i];g.age+=dt;const u=g.age/g.life;if(u>=1){g.s.removeFromParent();this.freeGlows.push(g);this.glows.splice(i,1);continue;}g.s.material.opacity=(1-u)*(1-u);g.s.scale.setScalar(g.size*(.8+u*.5));}
  let n=0;for(let i=this.sparkList.length-1;i>=0;i--){const s=this.sparkList[i];s.life-=dt;if(s.life<=0){this.freeSparks.push(s);this.sparkList.splice(i,1);continue;}s.v.y-=9.8*dt;s.v.multiplyScalar(Math.exp(-1.5*dt));s.p.addScaledVector(s.v,dt);const tail=.012+s.v.length()*.012;const a=this.sparkPositions;a[n*6]=s.p.x;a[n*6+1]=s.p.y;a[n*6+2]=s.p.z;a[n*6+3]=s.p.x-s.v.x*tail;a[n*6+4]=s.p.y-s.v.y*tail;a[n*6+5]=s.p.z-s.v.z*tail;n++;}
  this.sparkGeometry.setDrawRange(0,n*2);if(n){this.sparkGeometry.attributes.position.needsUpdate=true;}else if(this.sparkMesh.parent)this.sparkMesh.removeFromParent();
  if(this.lights){const l=this.lights;l.localAge+=dt;l.remoteAge+=dt;const f=(age,span)=>Math.max(0,1-age/span)**2;l.local.intensity=l.localPeak*f(l.localAge,.055);l.remote.intensity=l.remotePeak*f(l.remoteAge,l.remoteSpan);}
 }
 // Round start: holes, blood and scorch marks of the previous round are swept, as in CS.
 // V33: one stand-in per effect material, drawn once at load so the first hit, chip, casing or
 // flash of a match links no program and uploads no texture.
 warm(){const g=new THREE.Group();g.name='CombatFX warm';const mesh=(geo,mat)=>{const m=new THREE.Mesh(geo,mat);m.frustumCulled=false;g.add(m);};
  for(const mat of [...Object.values(this.markMats),...Object.values(this.chipMats),this.casingMat,this.trailMat,this.coreMat])mesh(this.markGeo,mat);
  for(const mat of [this.freePuffs[0].s.material,this.glowMaterial]){const s=new THREE.Sprite(mat);s.frustumCulled=false;g.add(s);}
  const spark=new THREE.LineSegments(this.sparkGeometry,this.sparkMesh.material);spark.frustumCulled=false;g.add(spark);return g;}
 clearMarks(){for(const m of this.marks){m.removeFromParent();this.freeMarks.push(m);}this.marks=[];}
 clear(){for(const t of this.trails)this.releaseTrail(t);this.trails=[];for(const m of this.marks){m.removeFromParent();this.freeMarks.push(m);}for(const p of this.particles)this.releaseParticle(p);for(const p of this.puffs){p.s.removeFromParent();this.freePuffs.push(p);}for(const g of this.glows){g.s.removeFromParent();this.freeGlows.push(g);}for(const s of this.sparkList)this.freeSparks.push(s);this.sparkList=[];this.sparkMesh.removeFromParent();this.marks=[];this.particles=[];this.puffs=[];this.glows=[];if(this.lights){this.lights.localPeak=this.lights.remotePeak=0;this.lights.local.intensity=this.lights.remote.intensity=0;}}
}
