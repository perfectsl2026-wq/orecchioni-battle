// Smoke clouds as soft billboards: about thirty puffs per cloud in three tones,
// placed in a squashed sphere that blooms in a second and thins before it ends.
// A full-screen veil, drawn with the world (so the weapon stays visible), greys the
// view while the camera is inside a cloud.
import * as T from './vendor/three.module.js';
import {SMOKE,smokeRadius,insideSmoke} from './smoke-rules.js?v=38.1';
export function puffTexture(){
 // Built from pixels rather than a 2D canvas: radial falloff broken up by value noise.
 const n=64,data=new Uint8Array(n*n*4),h=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);};
 const noise=(x,y)=>{const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return (h(i,j)*(1-u)+h(i+1,j)*u)*(1-v)+(h(i,j+1)*(1-u)+h(i+1,j+1)*u)*v;};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const dx=(x+.5)/n*2-1,dy=(y+.5)/n*2-1,r=Math.hypot(dx,dy),k=(y*n+x)*4;
  const grain=.55*noise(x/9,y/9)+.3*noise(x/4.5+7,y/4.5+3)+.15*noise(x/2.2+13,y/2.2+9),edge=Math.max(0,1-r*r)**1.15*(.62+.6*grain);
  data[k]=data[k+1]=data[k+2]=Math.round(225+30*grain);data[k+3]=Math.round(Math.min(1,edge*1.5)*255);}
 const t=new T.DataTexture(data,n,n);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
const VEIL_VERTEX='void main(){gl_Position=vec4(position.xy,0.,1.);}';
const VEIL_FRAGMENT='uniform vec3 uColor;uniform float uOpacity;void main(){gl_FragColor=vec4(uColor,uOpacity);}';
export class SmokeFX{
 constructor(scene){
  this.scene=scene;this.clouds=new Map();this.texture=puffTexture();this.sun=new T.Vector3(-.6,.6,-.5).normalize();this.work=new T.Vector3();this.work2=new T.Vector3();
  this.veil=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({vertexShader:VEIL_VERTEX,fragmentShader:VEIL_FRAGMENT,uniforms:{uColor:{value:new T.Color(0x8d918c)},uOpacity:{value:0}},transparent:true,depthTest:false,depthWrite:false}));
  this.veil.frustumCulled=false;this.veil.renderOrder=10000;this.veil.visible=false;scene.add(this.veil);
 }
 build(s){
  const g=new T.Group(),tones=[0xb6bab4,0x9fa39d,0x878b86].map(c=>new T.SpriteMaterial({map:this.texture,color:c,transparent:true,depthWrite:false,opacity:0,fog:true}));
  let seed=s.id*9301+49297;const rand=()=>((seed=(seed*16807)%2147483647)/2147483647);
  for(let n=0;n<40;n++){const a=rand()*Math.PI*2,u=rand()*2-1,r=Math.cbrt(rand())*.74,horizontal=Math.sqrt(1-u*u)*r;
   // Sun-side puffs take the light tone, the underside the shadow tone: the cloud reads as a lit volume.
   const home=new T.Vector3(Math.cos(a)*horizontal,u*r*.7,Math.sin(a)*horizontal),lit=home.clone().normalize().dot(this.sun);
   const sprite=new T.Sprite(tones[u<-.4?2:lit>.3?0:lit>-.3?1:2]);sprite.userData.home=home;sprite.userData.size=2.7+rand()*1.3;sprite.userData.drift=rand()*Math.PI*2;sprite.userData.push=null;g.add(sprite);}
  g.position.set(s.x,s.y,s.z);g.userData={tones,born:s.born,until:s.until,blastAt:-Infinity};this.scene.add(g);return g;
 }
 setSun(direction){this.sun.copy(direction).normalize();}
 // A bullet through the cloud shoves the puffs it passes aside for about a second,
 // opening a thin tunnel that closes again, as the CS2 volumetric smoke does.
 carve(from,to,now){
  if(!Array.isArray(from)||!Array.isArray(to))return;const a=this.work.set(...from),ab=this.work2.set(...to).sub(a),len2=ab.lengthSq();if(len2<.01)return;
  for(const g of this.clouds.values()){const t=Math.max(0,Math.min(1,((g.position.x-a.x)*ab.x+(g.position.y-a.y)*ab.y+(g.position.z-a.z)*ab.z)/len2));
   const cx=a.x+ab.x*t-g.position.x,cy=a.y+ab.y*t-g.position.y,cz=a.z+ab.z*t-g.position.z;if(cx*cx+cy*cy+cz*cz>SMOKE.radius*SMOKE.radius*1.4)continue;
   for(const s of g.children){const p=s.position,u=Math.max(0,Math.min(1,((p.x+g.position.x-a.x)*ab.x+(p.y+g.position.y-a.y)*ab.y+(p.z+g.position.z-a.z)*ab.z)/len2));
    const qx=a.x+ab.x*u-g.position.x-p.x,qy=a.y+ab.y*u-g.position.y-p.y,qz=a.z+ab.z*u-g.position.z-p.z,d=Math.hypot(qx,qy,qz);if(d>1.45)continue;
    const push=s.userData.push??={x:0,y:0,z:0,at:0,ms:1000,amount:0};const k=(1.45-d)/1.45;push.x=-qx/(d||1);push.y=-qy/(d||1)*.4;push.z=-qz/(d||1);push.amount=.9+.8*k;push.at=now;push.ms=1000+400*k;}}
 }
 // An HE burst blows the cloud open around it for a moment, then it drifts back.
 blast(point,now){
  if(!Array.isArray(point))return;const b=this.work.set(...point);
  for(const g of this.clouds.values()){if(g.position.distanceTo(b)>SMOKE.radius+4)continue;g.userData.blastAt=now;
   for(const s of g.children){const d=Math.hypot(s.position.x+g.position.x-b.x,s.position.y+g.position.y-b.y,s.position.z+g.position.z-b.z);if(d>4.5)continue;
    const push=s.userData.push??={x:0,y:0,z:0,at:0,ms:1000,amount:0};const k=1-d/4.5;push.x=(s.position.x+g.position.x-b.x)/(d||1);push.y=.35;push.z=(s.position.z+g.position.z-b.z)/(d||1);push.amount=1.5+2*k;push.at=now;push.ms=1500+500*k;}}
 }
 update(state,now,camera){
  const live=new Set();
  for(const s of state.smokes||[]){if(now>=s.until)continue;live.add(s.id);const g=this.clouds.get(s.id)||this.clouds.set(s.id,this.build(s)).get(s.id);
   const r=smokeRadius(s,now),k=r/SMOKE.radius,fade=Math.min(1,(s.until-now)/SMOKE.fadeMs,(now-s.born)/250);
   const blown=Math.min(1,(now-g.userData.blastAt)/1500);
   for(const m of g.userData.tones)m.opacity=.92*fade*(.3+.7*blown);
   for(const sprite of g.children){const d=sprite.userData,t=now/1000;sprite.position.copy(d.home).multiplyScalar(SMOKE.radius*k);sprite.position.x+=Math.sin(t*.35+d.drift)*.12;sprite.position.y+=Math.max(0,k-.6)*.25+Math.sin(t*.27+d.drift)*.06;let size=d.size*(.45+.55*k)*SMOKE.radius/3.2;
    if(d.push){const age=(now-d.push.at)/d.push.ms;if(age>=1)d.push=null;else{const w=(1-age)*(1-age)*d.push.amount;sprite.position.x+=d.push.x*w;sprite.position.y+=d.push.y*w;sprite.position.z+=d.push.z*w;size*=1-.45*(1-age);}}
    sprite.scale.setScalar(size);}}
  for(const [id,g]of this.clouds)if(!live.has(id)){g.removeFromParent();for(const m of g.userData.tones)m.dispose();this.clouds.delete(id);}
  const depth=camera?insideSmoke(camera.position.toArray()):0;this.veil.visible=depth>.01;this.veil.material.uniforms.uOpacity.value=Math.min(.97,depth*2.2);
 }
 clear(){for(const g of this.clouds.values()){g.removeFromParent();for(const m of g.userData.tones)m.dispose();}this.clouds.clear();this.veil.visible=false;}
}

// HE burst: a dark puff that swells for 1.3 s and thins out, under the flash light.
export class BlastFX{
 constructor(scene){this.scene=scene;this.live=[];this.texture=puffTexture();}
 burst(point,now){
  const g=new T.Group(),m=new T.SpriteMaterial({map:this.texture,color:0x5b5752,transparent:true,depthWrite:false,opacity:.85});
  for(let n=0;n<9;n++){const s=new T.Sprite(m);const a=n*2.39,r=.3+(n%3)*.35;s.userData.home=new T.Vector3(Math.cos(a)*r,.4+(n%4)*.3,Math.sin(a)*r);s.userData.size=1.6+(n%3)*.5;g.add(s);}
  g.position.set(point[0],point[1],point[2]);this.scene.add(g);this.live.push({g,m,born:now});
 }
 update(now){
  for(let n=this.live.length-1;n>=0;n--){const b=this.live[n],t=(now-b.born)/1300;if(t>=1){b.g.removeFromParent();b.m.dispose();this.live.splice(n,1);continue;}
   const k=1-Math.pow(1-t,3);b.m.opacity=.85*(1-t)*(1-t);for(const s of b.g.children){s.position.copy(s.userData.home).multiplyScalar(.5+2.2*k);s.position.y+=k*1.2;s.scale.setScalar(s.userData.size*(.3+k));}}
 }
 clear(){for(const b of this.live){b.g.removeFromParent();b.m.dispose();}this.live.length=0;}
}
// Fire patch: additive flame sprites flickering over a scorched disc, grey smoke rising.
export class FireFX{
 constructor(scene){this.scene=scene;this.patches=new Map();this.texture=puffTexture();this.expired=[];}
 build(f){
  const g=new T.Group();g.position.set(f.x,f.y,f.z);
  const flame=new T.SpriteMaterial({map:this.texture,color:0xe8641c,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.7}),core=new T.SpriteMaterial({map:this.texture,color:0xffc45c,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.6}),soot=new T.SpriteMaterial({map:this.texture,color:0x3a3633,transparent:true,depthWrite:false,opacity:.5});
  let seed=f.id*7919+13;const rand=()=>((seed=(seed*16807)%2147483647)/2147483647);
  for(let n=0;n<48;n++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*3.0,s=new T.Sprite(n<12?core:flame);s.userData={x:Math.cos(a)*r,z:Math.sin(a)*r,size:.55+rand()*.5,phase:rand()*7,rate:6+rand()*5};g.add(s);}
  // Ground glow so the patch reads from across the map, as a molotov pool does.
  const glow=new T.Mesh(new T.CircleGeometry(3.3,28),new T.MeshBasicMaterial({color:0xff6a1a,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));glow.rotation.x=-Math.PI/2;glow.position.y=.05;g.add(glow);g.userData.glow=glow;
  for(let n=0;n<6;n++){const a=rand()*Math.PI*2,r=rand()*2.2,s=new T.Sprite(soot);s.userData={x:Math.cos(a)*r,z:Math.sin(a)*r,size:1.4+rand()*.8,phase:rand()*7,rate:1.5+rand(),rise:1.6+rand()*1.2};g.add(s);}
  const scorch=new T.Mesh(new T.CircleGeometry(3.2,24),new T.MeshBasicMaterial({color:0x1b1715,transparent:true,opacity:0,depthWrite:false}));scorch.rotation.x=-Math.PI/2;scorch.position.y=.03;g.add(scorch);
  g.userData={flame,core,soot,scorch,glow:g.userData.glow};this.scene.add(g);return g;
 }
 update(state,now){
  const live=new Set();
  for(const f of state.fires||[]){live.add(f.id);const g=this.patches.get(f.id)||this.patches.set(f.id,this.build(f)).get(f.id);const t=now/1000,age=(now-f.born)/1000,left=(f.until-now)/1000,k=Math.min(1,age/.5)*Math.min(1,left/1.2);
   g.userData.scorch.material.opacity=Math.min(.55,age*.4);g.userData.glow.material.opacity=.38*k*(.8+.2*Math.sin(t*9));
   for(const s of g.children){if(!s.isSprite)continue;const d=s.userData;if(d.rise){const r=((t*d.rate+d.phase)%3)/3;s.position.set(d.x,.4+r*d.rise,d.z);s.scale.setScalar(d.size*(.6+r));s.material.opacity=.45*k*(1-r);continue;}
    const fl=.6+.4*Math.sin(t*d.rate+d.phase)*Math.sin(t*d.rate*1.7+d.phase*2);s.position.set(d.x+Math.sin(t*2+d.phase)*.06,.12+d.size*.5+fl*.3,d.z);s.scale.set(d.size*.9,d.size*(1.1+fl*.8),1);s.material.opacity=.8*k;}}
  // Burnt-out patches are reported once, so the caller can leave a scorch behind.
  for(const [id,g]of this.patches)if(!live.has(id)){this.expired.push({x:g.position.x,y:g.position.y,z:g.position.z});g.removeFromParent();for(const m of [g.userData.flame,g.userData.core,g.userData.soot])m.dispose();this.patches.delete(id);}
 }
 clear(){for(const g of this.patches.values()){g.removeFromParent();for(const m of [g.userData.flame,g.userData.core,g.userData.soot])m.dispose();}this.patches.clear();this.expired.length=0;}
}
