import * as T from './vendor/three.module.js';
import {SKIES} from './atmosphere.js?v=42.0';
import {streetClock} from './street-props.js?v=42.0';
// V44 surroundings: what lies beyond the playable walls. Each arena gets one merged,
// unlit, vertex-coloured mesh in three depth layers (near roofs or slopes, a mid
// skyline with its landmarks, far ranges) baked with their own aerial perspective,
// so a single draw call reaches the sky. Cosmetic: no shadows, no collision, no hits.
// Phones keep the earlier surroundings and textures (game.js calls useLiteWorld()).
// ?lite=1 previews the phone path on a desktop (QA before/after boards).
let lite=typeof location!=='undefined'&&/[?&]lite=1/.test(location.search);export function useLiteWorld(){lite=true;}export const liteWorld=()=>lite;
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Authored in display (sRGB) values, stored linear like the sky palette.
const C=(r,g,b)=>new T.Color().setRGB(r,g,b,T.SRGBColorSpace);
// Surface kinds for the procedural detail in the shader.
const PLAIN=0,FACADE=1,ROCK=2,RIBBED=3,CONCRETE=4,CURTAIN=5,TRUSS=6,WATER=7;
const DETAIL=`
float hzHash(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
float hzNoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(hzHash(i),hzHash(i+vec2(1,0)),u.x),mix(hzHash(i+vec2(0,1)),hzHash(i+vec2(1,1)),u.x),u.y);}
// Anti-aliased box pulse: 1 inside [a,b] of a repeating cell, filtered by the pixel footprint.
float hzPulse(float x,float a,float b,float w){float f=fract(x);return clamp((min(f-a,b-f))/max(w,1e-4)+.5,0.,1.);}
`;
const VERTEX=`attribute vec3 detail;varying vec3 vHzColor;varying vec3 vHzW;varying vec3 vHzN;varying vec3 vHzD;
void main(){vHzColor=color;vHzD=detail;vec4 w=modelMatrix*vec4(position,1.);vHzW=w.xyz;vHzN=normal;gl_Position=projectionMatrix*viewMatrix*w;}`;
const FRAGMENT=`uniform vec3 hzHaze,hzSun;uniform float hzDensity,hzMist,hzTime;varying vec3 vHzColor;varying vec3 vHzW;varying vec3 vHzN;varying vec3 vHzD;`+DETAIL+`
void main(){
 vec3 c=vHzColor,n=normalize(vHzN),an=abs(n);int kind=int(vHzD.x+.5);
 // V44c aerial perspective from the camera, not the map centre; low ground mist on top.
 float hzD=length(vHzW-cameraPosition),air=1.-exp(-pow(hzD*hzDensity,2.)),low=hzMist*(1.-smoothstep(0.,38.,vHzW.y));float k=min(.86,(air+(1.-air)*low)*vHzD.y+vHzD.z);
 vec2 fp=an.y>.72?vHzW.xz:vec2(an.x>an.z?vHzW.z:vHzW.x,vHzW.y);
 float grain=hzNoise(fp*1.7)*.5+hzNoise(fp*5.3)*.5;
 if(kind==6){
  // Lattice steel: braced cells cut out of the face (both sides of the box show through), solid once sub-pixel.
  vec2 cell=fp/1.5;vec2 fw=fwidth(cell);float far=smoothstep(.16,.38,max(fw.x,fw.y));vec2 f=fract(cell);float w=.13;
  float m=max(max(step(f.x,w),step(1.-w,f.x)),max(step(f.y,w),step(1.-w,f.y)));m=max(m,step(abs(f.x-f.y),w*.75));
  if(m<.5&&far<.5)discard;c*=mix(1.,.78,far);
 }else if(kind==1||kind==5){
  // Facades: storeys of punched windows (kind 1) or a curtain wall of mullions (kind 5); some panes catch the sky.
  vec2 cell=fp/(kind==1?vec2(2.6,3.3):vec2(1.6,3.3));vec2 fw=fwidth(cell);float fade=1.-smoothstep(.22,.55,max(fw.x,fw.y));
  float lit=hzHash(floor(cell)+floor(vHzW.y*.01));vec3 pane=lit>.78?vec3(.42,.5,.56):lit>.7?vec3(.75,.62,.42):vec3(.06,.075,.085);
  if(kind==1){float win=hzPulse(cell.x,.24,.76,fw.x)*hzPulse(cell.y,.3,.78,fw.y)*step(1.2,vHzW.y)*step(an.y,.5);
   c=mix(c*(.96+.08*grain),pane,win*.92*fade)*(1.-.18*hzPulse(cell.y,.0,.07,fw.y)*fade);c=mix(c,c*.72+vec3(.02),(1.-fade)*.4*step(an.y,.5));}
  else{float mull=max(1.-hzPulse(cell.x,.06,.94,fw.x),1.-hzPulse(cell.y,.08,.92,fw.y))*step(an.y,.5);c=mix(mix(c,pane*1.4,.35*(.5+.5*hzNoise(cell*.3))),c*1.6+.04,mull*fade);}
 }else if(kind==2){
  // Rock: warped strata, rain streaks down the faces, crumbly grain.
  float warp=hzNoise(fp*.035)*6.;float strata=hzNoise(vec2(fp.x*.05,vHzW.y*.42+warp));float streak=hzNoise(vec2(fp.x*.55,vHzW.y*.035));
  c*=(.74+.38*strata)*(.82+.3*streak)*(.9+.2*grain);
 }else if(kind==3){
  vec2 cell=fp*vec2(1.7,1.);float fw=fwidth(cell.x);c*=.84+.2*hzPulse(cell.x,.15,.65,fw)*(1.-smoothstep(.3,.6,fw));c*=.92+.12*grain;
 }else if(kind==4){
  // Mass concrete: 15 m blocks, 2.5 m lifts, seepage stains below the crest.
  vec2 fw=fwidth(fp/vec2(15.,2.5));float joint=max(1.-hzPulse(fp.x/15.,.015,.985,fw.x),1.-hzPulse(fp.y/2.5,.04,.96,fw.y))*(1.-smoothstep(.2,.5,max(fw.x,fw.y)));
  float stain=hzNoise(vec2(fp.x*.35,vHzW.y*.02))*smoothstep(.0,40.,vHzW.y);c*=(1.-.16*joint)*(.86+.22*grain)*(1.-.22*smoothstep(.55,.9,stain));
 }else if(kind==7){
  // Spillway: white water sliding down the chute.
  float st=hzNoise(vec2(fp.x*1.3,vHzW.y*.06+hzTime*.9))*.6+hzNoise(vec2(fp.x*3.1,vHzW.y*.12+hzTime*1.5))*.4;c=mix(c,vec3(.86,.9,.92),smoothstep(.42,.78,st)*.85);
 }else c*=.93+.14*grain;
 // Toward the sun the haze is brighter; thin it and let the silhouettes fall into contre-jour so they stay readable.
 vec3 v=normalize(vHzW-cameraPosition);float sunward=pow(max(dot(v,normalize(hzSun)),0.),3.);
 c*=1.-.32*sunward;k*=1.-.38*sunward;
 // The haze keeps some of the local tone: bright snow and pale rock stay lighter than shadowed faces,
 // and distance first greys the colour before it turns into sky.
 float l=dot(c,vec3(.3,.59,.11));vec3 veil=hzHaze*mix(.8,1.16,clamp(l*2.4,0.,1.));c=mix(c,vec3(l),k*.35);
 gl_FragColor=vec4(mix(c,veil,k*.94),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
class Silhouette{
 constructor(palette,sun,{density=.0052,mist=.32}={}){this.pos=[];this.col=[];this.nor=[];this.det=[];this.haze=C(...palette.horizon).multiplyScalar(1.02);this.sunArr=sun;this.sun=new T.Vector3(...sun).normalize();this.density=density;this.mist=mist;this.kind=PLAIN;this.clear=1;this.tmp=[new T.Vector3(),new T.Vector3(),new T.Vector3(),new T.Vector3()];}
  vertex(v,n,color,lit,extra){this.pos.push(v[0],v[1],v[2]);this.nor.push(n.x,n.y,n.z);this.col.push(color.r*lit,color.g*lit,color.b*lit);this.det.push(this.kind,this.clear,extra);}
 shade(n,glow=0){return .42+.78*Math.max(0,n.dot(this.sun))+.08*Math.max(0,n.y)+glow;}
 // One flat-shaded triangle; its normal is turned toward the arena so either winding lights the same.
 tri(a,b,c,color,{glow=0,extra=0}={}){
  const [va,vb,vc,n]=this.tmp;va.fromArray(a);vb.fromArray(b);vc.fromArray(c);n.subVectors(vb,va).cross(vc.clone().sub(va)).normalize();
  const cx=(a[0]+b[0]+c[0])/3,cz=(a[2]+b[2]+c[2])/3;if(n.x*-cx+n.z*-cz+n.y*40<0)n.negate();
  const lit=this.shade(n,glow);for(const v of [a,b,c])this.vertex(v,n,color,lit,extra);
 }
 quad(a,b,c,d,color,o){this.tri(a,b,c,color,o);this.tri(a,c,d,color,o);}
 // Smooth surface from a grid of points (rows x cols), per-vertex normals and colours.
 surface(grid,color,{wrap=false}={}){
  const R=grid.length,Cn=grid[0].length,P=(i,j)=>grid[wrap?(i+R)%R:Math.max(0,Math.min(R-1,i))][Math.max(0,Math.min(Cn-1,j))],a=new T.Vector3(),b=new T.Vector3(),n=new T.Vector3();
  const N=grid.map((row,i)=>row.map((v,j)=>{a.fromArray(P(i+1,j)).sub(new T.Vector3().fromArray(P(i-1,j)));b.fromArray(P(i,j+1)).sub(new T.Vector3().fromArray(P(i,j-1)));n.crossVectors(a,b).normalize();if(n.x*-v[0]+n.z*-v[2]+n.y*40<0)n.negate();return n.clone();}));
  const put=(i,j)=>{const v=grid[i%R][j],nn=N[i%R][j];this.vertex(v,nn,color(v[1],i,j),this.shade(nn),0);};
  for(let i=0;i<(wrap?R:R-1);i++)for(let j=0;j<Cn-1;j++){put(i,j);put(i+1,j);put(i+1,j+1);put(i,j);put(i+1,j+1);put(i,j+1);}
 }
 // Box standing on y0 (no floor), turned by yaw about its centre.
 box(x,y0,z,w,h,d,color,{yaw=0,top=null,o}={}){
  const c=Math.cos(yaw),s=Math.sin(yaw),P=(u,y,v)=>[x+u*c+v*s,y,z-u*s+v*c],y1=y0+h,u=w/2,v=d/2;
  const q=[[-u,-v],[u,-v],[u,v],[-u,v]];
  for(let i=0;i<4;i++){const [a0,b0]=q[i],[a1,b1]=q[(i+1)%4];this.quad(P(a0,y0,b0),P(a1,y0,b1),P(a1,y1,b1),P(a0,y1,b0),color,o);}
  this.quad(P(-u,y1,-v),P(u,y1,-v),P(u,y1,v),P(-u,y1,v),top||color,o);
 }
 // Frustum (r0 at the base, r1 at the top), optionally capped.
 cyl(x,y0,z,r0,r1,h,color,{seg=10,cap=true,o}={}){
  for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;
   this.quad([x+Math.cos(a)*r0,y0,z+Math.sin(a)*r0],[x+Math.cos(b)*r0,y0,z+Math.sin(b)*r0],[x+Math.cos(b)*r1,y0+h,z+Math.sin(b)*r1],[x+Math.cos(a)*r1,y0+h,z+Math.sin(a)*r1],color,o);
   if(cap&&r1>0)this.tri([x,y0+h,z],[x+Math.cos(a)*r1,y0+h,z+Math.sin(a)*r1],[x+Math.cos(b)*r1,y0+h,z+Math.sin(b)*r1],color,o);}
 }
 // A ring-shaped range between angles a0..a1: profile rows [radial offset, height fraction]. Smooth-shaded.
 ridge({a0,a1,seg,radius,height,profile,color,base=-2,kind=ROCK}){
  const grid=[];for(let i=0;i<=seg;i++){const a=a0+(a1-a0)*i/seg,r=radius(a),h=height(a),cs=Math.cos(a),sn=Math.sin(a);grid.push(profile.map(([dr,f])=>[cs*(r+dr),base+(h-base)*f,sn*(r+dr)]));}
  const prev=this.kind;this.kind=kind;this.surface(grid,(y,i,j)=>color(y,a0+(a1-a0)*i/seg,j,y));this.kind=prev;
 }
 // Flat ground annulus.
 ground(r0,r1,y,color,seg=96){const rs=[r0,r0+(r1-r0)*.15,r0+(r1-r0)*.4,r1];for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;for(let k=0;k<rs.length-1;k++)this.quad([Math.cos(a)*rs[k],y,Math.sin(a)*rs[k]],[Math.cos(b)*rs[k],y,Math.sin(b)*rs[k]],[Math.cos(b)*rs[k+1],y,Math.sin(b)*rs[k+1]],[Math.cos(a)*rs[k+1],y,Math.sin(a)*rs[k+1]],color);}}
 mesh(name){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(this.nor,3));g.setAttribute('color',new T.Float32BufferAttribute(this.col,3));g.setAttribute('detail',new T.Float32BufferAttribute(this.det,3));g.computeBoundingSphere();
  const m=new T.ShaderMaterial({vertexShader:VERTEX,fragmentShader:FRAGMENT,vertexColors:true,side:T.DoubleSide,fog:false,uniforms:{hzDensity:{value:this.density},hzMist:{value:this.mist},hzTime:streetClock,hzHaze:{value:this.haze},hzSun:{value:new T.Vector3(...this.sunArr).normalize()}}});m.extensions={derivatives:true};m.userData.nonBallistic=true;m.userData.horizon=true;
  const mesh=new T.Mesh(g,m);mesh.name=name;mesh.castShadow=mesh.receiveShadow=false;mesh.matrixAutoUpdate=false;mesh.renderOrder=-50;mesh.userData.cosmetic=true;mesh.userData.keep=true;mesh.userData.horizon=true;return mesh;
 }
}
const outside=(x,z,bx,bz,m)=>Math.abs(x)>bx+m||Math.abs(z)>bz+m;
// Districts of flat-roofed blocks between two radii; windows and storeys come from the shader (FACADE).
function district(s,r,{seed,r0,r1,count,hMin,hMax,palette,bounds,arc=[0,Math.PI*2],bands=12}){
 const rand=rng(seed);let placed=0;
 for(let n=0;n<count*3&&placed<count;n++){const a=arc[0]+(arc[1]-arc[0])*rand(),rr=r0+(r1-r0)*rand(),x=Math.cos(a)*rr,z=Math.sin(a)*rr;if(bounds&&!outside(x,z,bounds[0],bounds[1],10))continue;
  const w=6+rand()*12,d=6+rand()*12,h=hMin+(hMax-hMin)*Math.pow(rand(),1.8),col=palette[(rand()*palette.length)|0],yaw=a+(rand()-.5)*.25;
  s.kind=FACADE;s.box(x,-1,z,w,h+1,d,col,{yaw});s.kind=PLAIN;s.box(x,h,z,w+.5,.7,d+.5,col.clone().multiplyScalar(1.08),{yaw});
  if(rand()<.45)s.cyl(x+(rand()-.5)*w*.5,h+.7,z+(rand()-.5)*d*.5,1.1,1.1,1.6,C(.62,.6,.56),{seg:6});
  placed++;}
}
// ---------------------------------------------------------------- SAHRA
// Modern desert district: low town beyond the walls, a mid skyline with its
// landmarks, a dune sea and red mesas closing the horizon.
function sahra(){
 const s=new Silhouette(SKIES.sahra,[-82,64,-60],{density:.0036,mist:.16});
 s.ground(70,255,-.4,C(.6,.47,.33));
 const stucco=[C(.78,.68,.55),C(.74,.6,.46),C(.8,.74,.64),C(.66,.5,.38),C(.72,.66,.58)];
 district(s,null,{seed:13,r0:74,r1:100,count:70,hMin:4,hMax:11,palette:stucco,bounds:[47.2,51.2]});
 district(s,null,{seed:29,r0:110,r1:150,count:60,hMin:7,hMax:30,palette:stucco,bands:14});
 // Business quarter to the south-east: four glass towers with stone fins.
 const glass=C(.32,.42,.47),fin=C(.82,.76,.66);
 for(const [x,z,w,h]of [[70,-128,14,52],[88,-118,11,64],[58,-148,16,40],[96,-140,12,46]]){s.kind=CURTAIN;s.box(x,-1,z,w,h+1,w,glass,{yaw:.5,top:fin});s.kind=PLAIN;for(const u of [-1,1])s.box(x+Math.cos(.5)*u*w/2,-1,z-Math.sin(.5)*u*w/2,1.1,h+2.5,w+1,fin,{yaw:.5});s.box(x,h+1,z,w*.5,3,w*.5,fin,{yaw:.5});}
 // Landmark 1: the wind tower, stepped setbacks under an open crown frame and a needle.
 {const x=-104,z=-118,stone=C(.84,.78,.68),teal=C(.18,.36,.38);s.kind=FACADE;s.box(x,-1,z,14,33,14,stone);s.box(x,32,z,10,22,10,stone);s.box(x,54,z,7,13,7,stone);s.kind=PLAIN;
  for(const y of [8,16,24])s.box(x,y,z,14.3,1.4,14.3,teal);for(const y of [38,46])s.box(x,y,z,10.3,1.6,10.3,teal);
  for(const [u,v]of [[-1,-1],[1,-1],[1,1],[-1,1]])s.box(x+u*3.2,67,z+v*3.2,.9,9,.9,stone);s.box(x,76,z,8,1.2,8,stone);s.cyl(x,77,z,.5,.08,14,stone,{seg:6});}
 // Landmark 2: the mushroom water tower with a terracotta band.
 {const x=-96,z=92,white=C(.86,.82,.74),terra=C(.62,.32,.2);s.cyl(x,-1,z,2.6,2,30,white,{seg:12,cap:false});s.cyl(x,29,z,2,9.5,7,white,{seg:16,cap:false});s.cyl(x,36,z,9.5,9.5,4,terra,{seg:16,cap:false});s.cyl(x,40,z,9.5,1.5,3.5,white,{seg:16});}
 // Landmark 3: telecom mast in red and white sections with dish platforms.
 {const x=-142,z=-30;for(let i=0;i<10;i++)s.cyl(x,i*6.4-1,z,1.3-i*.07,1.23-i*.07,6.4,i%2?C(.86,.84,.8):C(.62,.14,.1),{seg:8,cap:false});
  for(const y of [34,48])s.cyl(x,y,z,3.4,3.4,1.2,C(.8,.78,.74),{seg:10});s.cyl(x,63,z,.4,.1,8,C(.62,.14,.1),{seg:6});}
 // A highway viaduct crossing the north-east plain.
 s.kind=CONCRETE;for(let i=0;i<26;i++){const t=i/25,x=40+t*130,z=150-t*60;s.box(x,-1,z,1.8,8,1.8,C(.7,.64,.56));}s.kind=PLAIN;
 s.ridge({a0:.2,a1:1.25,seg:40,radius:a=>{const t=(a-.2)/1.05;return Math.hypot(40+t*130,150-t*60);},height:()=>8.6,profile:[[-3,.92],[-3,1],[3,1],[3,.92]],base:-1,kind:CONCRETE,color:()=>C(.74,.68,.6)});
 // Dune sea, then the mesas: banded sandstone cliffs on talus slopes with flat caps.
 s.ridge({a0:0,a1:Math.PI*2,seg:150,radius:a=>178+Math.sin(a*5)*9+Math.sin(a*11+1)*5,height:a=>5+Math.max(0,Math.sin(a*7+.6))*9+Math.sin(a*17)*2,profile:[[-30,0],[-12,.55],[-3,.96],[0,1],[8,.7],[26,0]],kind:PLAIN,color:(y)=>C(.7,.52,.34).multiplyScalar(.9+y*.012)});
 const mesa=a=>{const m=Math.max(smooth(.25,.4,Math.sin(a*3+.7)),smooth(.35,.5,Math.sin(a*5+2.1))*.8);return 7+m*(26+Math.sin(a*2.3)*10)+Math.sin(a*29)*1.2;};
 s.ridge({a0:0,a1:Math.PI*2,seg:220,radius:a=>228+Math.sin(a*4+1)*8,height:mesa,profile:[[-26,0],[-12,.3],[-5,.85],[-3.5,.97],[-2,1],[18,1],[40,0]],
  color:(y,a,k)=>k>=4?C(.62,.42,.29):Math.floor(y/4.2)%2?C(.58,.34,.22):C(.7,.47,.31)});
 return s.mesh('SAHRA / orizzonte');
}
// ---------------------------------------------------------------- CALDERA
// The port across the bay: a container terminal on a long mole with three
// ship-to-shore cranes and a moored carrier; behind the rim, a second range and
// the volcano that names the map; low islands on the open sea.
function crane(s,x,z,yaw,paint,white){
 const c=Math.cos(yaw),sn=Math.sin(yaw),P=(u,v)=>[x+u*c+v*sn,z-u*sn+v*c];s.kind=TRUSS;
 for(const [u,v]of [[-8,-7],[8,-7],[-8,7],[8,7]]){const [px,pz]=P(u,v);s.box(px,-1,pz,2.2,37,2.2,paint,{yaw});}
 for(const u of [-8,8]){const [px,pz]=P(u,0);s.box(px,30,pz,1.8,2.2,16,white,{yaw});}
 for(const v of [-7,7]){const [px,pz]=P(0,v);s.box(px,34,pz,17.6,2.4,1.8,paint,{yaw});}
 const [bx,bz]=P(0,-12);s.box(bx,36.4,bz,4.2,2.6,58,white,{yaw});
 const [ax,az]=P(0,6);s.box(ax,36.4,az,3.4,16,3.4,paint,{yaw});s.kind=PLAIN;const [hx,hz]=P(0,9);s.box(hx,36.4,hz,7,5,7,white,{yaw});
 for(const v of [-38,-20,14]){const [tx,tz]=P(0,v),[ox,oz]=P(0,6);s.tri([ox,52.4,oz],[tx,39,tz],[tx+.4,39,tz+.4],white);}
}
// Fumarole plume: a dozen camera-facing soft puffs rising, growing and fading on the shared clock.
function plume(at,haze){
 const n=14,pos=[],corner=[],seed=[],index=[];
 for(let i=0;i<n;i++){const b=i*4;for(const [u,v]of [[-1,-1],[1,-1],[1,1],[-1,1]]){pos.push(...at);corner.push(u,v);seed.push(i/n);}index.push(b,b+1,b+2,b,b+2,b+3);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('corner',new T.Float32BufferAttribute(corner,2));g.setAttribute('seed',new T.Float32BufferAttribute(seed,1));g.setIndex(index);
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,fog:false,uniforms:{hzTime:streetClock,hzHaze:{value:haze}},
  vertexShader:`uniform float hzTime;attribute vec2 corner;attribute float seed;varying vec2 vUv;varying float vA,vS;
void main(){float life=fract(hzTime*.011+seed);vec3 c=position+vec3(life*34.+sin(seed*41.+hzTime*.05)*3.,life*58.,life*12.+cos(seed*29.)*3.);
 float size=7.+life*30.;vec4 mv=viewMatrix*modelMatrix*vec4(c,1.);mv.xy+=corner*size;vUv=corner;vS=seed;vA=smoothstep(0.,.1,life)*(1.-smoothstep(.5,1.,life));gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform vec3 hzHaze;uniform float hzTime;varying vec2 vUv;varying float vA,vS;`+DETAIL+`
void main(){float n=hzNoise(vUv*2.2+vS*17.+hzTime*.03)*.65+hzNoise(vUv*5.+vS*9.)*.35;float r=length(vUv)+(n-.5)*.45;float a=(1.-smoothstep(.2,1.,r))*vA*.72;if(a<.004)discard;
 // Grey ash-laden steam, lit from above, so it reads against the pale sky.
 vec3 c=mix(vec3(.4,.39,.38),vec3(.82,.81,.79),clamp(n*.7+vUv.y*.35+.15,0.,1.));gl_FragColor=vec4(mix(c,hzHaze,.15),a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});m.userData.nonBallistic=true;
 const mesh=new T.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=-40;mesh.castShadow=mesh.receiveShadow=false;mesh.userData.cosmetic=true;mesh.userData.keep=true;mesh.userData.horizon=true;mesh.name='CALDERA / fumarola';return mesh;
}
function caldera(){
 const s=new Silhouette(SKIES.caldera,[-72,64,34],{density:.0033,mist:.12});
 const paint=C(.62,.18,.08),white=C(.85,.86,.84),quay=C(.58,.58,.56);
 // Mole and terminal on the far side of the bay (south-west), a long low line on the water.
 const mole=(a,r)=>[Math.cos(a)*r,Math.sin(a)*r];
 s.ridge({a0:1.55,a1:2.55,seg:30,radius:()=>150,height:()=>2.2,profile:[[-9,.2],[-8,1],[8,1],[9,.2]],base:-1.3,kind:CONCRETE,color:()=>quay});
 const stacks=[C(.55,.22,.16),C(.2,.33,.42),C(.62,.6,.54),C(.3,.42,.3),C(.66,.44,.18)],rand=rng(41);
 s.kind=RIBBED;for(let i=0;i<34;i++){const a=1.62+i*.026,[x,z]=mole(a,152+rand()*4),h=2.6*(1+((rand()*4)|0));s.box(x,2,z,6,h,2.5,stacks[(rand()*5)|0],{yaw:-a});}s.kind=PLAIN;
 for(const a of [1.72,1.9,2.08]){const [x,z]=mole(a,143);crane(s,x,z,-a+Math.PI/2,paint,white);}
 // A container carrier moored along the mole.
 {const a=2.24,[x,z]=mole(a,139);s.box(x,-1.3,z,72,9,13,C(.16,.2,.24),{yaw:-a+Math.PI/2,top:C(.5,.18,.14)});
  for(let i=-3;i<=2;i++){const [cx,cz]=[x+Math.cos(-a+Math.PI/2)*i*9.5,z-Math.sin(-a+Math.PI/2)*i*9.5];s.kind=RIBBED;s.box(cx,7.7,cz,8.6,5.2,12,stacks[(i+5)%5],{yaw:-a+Math.PI/2});s.kind=PLAIN;}
  const [bx,bz]=[x-Math.cos(-a+Math.PI/2)*31,z+Math.sin(-a+Math.PI/2)*31];s.box(bx,7.7,bz,6,14,12.5,white,{yaw:-a+Math.PI/2});s.cyl(bx,21.7,bz,1.4,1.4,4,C(.5,.18,.14),{seg:8});}
 // Islands on the open sea, low and very hazy.
 for(const [a,r,w,h]of [[2.9,262,40,14],[3.25,280,64,22],[1.2,270,50,12]])s.ridge({a0:a-w/r/2,a1:a+w/r/2,seg:12,radius:()=>r,height:b=>h*Math.max(0,Math.sin((b-a+w/r/2)/(w/r)*Math.PI))**.7-1.3,profile:[[-14,0],[-4,.8],[0,1],[10,0]],base:-1.3,color:()=>C(.34,.38,.36)});
 // Second range behind the rim, bluer and higher.
 s.ridge({a0:-Math.PI*.98,a1:Math.PI*.42,seg:140,radius:a=>222+Math.sin(a*2.7)*10,height:a=>34+Math.sin(a*4.1+1)*9+Math.sin(a*9.3)*5+Math.abs(Math.sin(a*17))*3,profile:[[-20,0],[-6,.75],[0,1],[30,.4]],base:-3,color:()=>C(.34,.36,.38)});
 // The volcano: a smooth stratocone with radial gullies and ridges, a crater lip and a thin plume, north.
 {const x=-42,z=-236,AS=128,RS=18,gully=(a,t)=>Math.pow(Math.abs(Math.sin(a*9+Math.sin(a*2.7)*1.8+t*1.6)),5)*Math.sin(Math.PI*Math.min(1,t*1.3))*t,outer=[],inner=[];
  for(let i=0;i<AS;i++){const a=i/AS*Math.PI*2,row=[],cr=[];
   for(let j=0;j<=RS;j++){const t=j/RS,r=(15+94*Math.pow(t,1.38))*(1+Math.sin(a*3+.5)*.05+Math.sin(a*7)*.022)+gully(a,t)*8;row.push([x+Math.cos(a)*r,86*Math.pow(1-t,1.6)-3+Math.sin(a*5)*1.4*(1-t)-gully(a,t)*3,z+Math.sin(a)*r]);}
   for(const [r,y]of [[15*(1+Math.sin(a*3+.5)*.05+Math.sin(a*7)*.022),83+Math.sin(a*5)*1.4],[10,76],[4,72]])cr.push([x+Math.cos(a)*r,y,z+Math.sin(a)*r]);
   outer.push(row);inner.push(cr);}
  // The landmark keeps more of its own colour through the haze than the ranges around it.
  s.kind=ROCK;s.clear=.5;
  // Dark basalt above, ash fans below, banded by old eruptions; lava ribs darker still.
  s.surface(outer,(y,i,j)=>{const a=i/AS*Math.PI*2,t=j/RS,g=gully(a,t),upper=1-smooth(.15,.55,t),band=.5+.5*Math.sin(y*.42+Math.sin(a*3)*2.2);
   const base=C(.5,.45,.39).lerp(C(.19,.17,.16),upper).lerp(C(.3,.24,.2),band*.35*(1-upper*.5));return g>.35?base.clone().multiplyScalar(.58):g<.05&&t>.3?base.clone().lerp(C(.58,.53,.46),.35):base;},{wrap:true});
  s.surface(inner,()=>C(.13,.11,.1),{wrap:true});s.kind=PLAIN;s.clear=1;
  s.plume=[x,84,z];}
 const mesh=s.mesh('CALDERA / orizzonte');mesh.add(plume(s.plume,s.haze));return mesh;
}
// Sea surface: two scrolling ripple octaves perturb the normal (no texture), so the sky
// and sun break into glints, and the water darkens toward the quay.
export function seaSurface(material){
 if(lite)return material;const previous=material.onBeforeCompile,key=material.customProgramCacheKey?.()||'';
 material.onBeforeCompile=function(shader,renderer){previous?.call(this,shader,renderer);shader.uniforms.uSeaClock=streetClock;
  shader.vertexShader='varying vec3 vSeaW;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSeaW=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader='uniform float uSeaClock;varying vec3 vSeaW;\nvec2 seaWave(vec2 p,vec2 d,float f,float s){float ph=dot(p,d)*f+uSeaClock*s;return d*cos(ph)*f;}\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
{vec2 p=vSeaW.xz;vec2 g=seaWave(p,vec2(.8,.6),.21,1.3)*.5+seaWave(p,vec2(-.4,.92),.37,1.9)*.32+seaWave(p,vec2(.97,-.24),.83,2.7)*.16+seaWave(p,vec2(-.7,-.71),1.9,3.6)*.07+seaWave(p,vec2(.2,.98),4.1,5.1)*.03;
float fade=1.-smoothstep(30.,220.,length(vViewPosition));vec3 wn=normalize(vec3(-g.x*.55*fade,1.,-g.y*.55*fade));normal=normalize((viewMatrix*vec4(wn,0.)).xyz);}`);};
 material.customProgramCacheKey=()=>key+'-sea44';return material;
}
// ---------------------------------------------------------------- FORGE
// Alpine head of valley: a forested first range, the arch dam filling the notch to
// the north with its crest road and spillway, a summit radio station, and snowy
// peaks fading into blue haze behind.
function forge(){
 const s=new Silhouette(SKIES.forge,[-23.4,23.2,3],{density:.0029,mist:.1});
 const jag=a=>{let v=0,amp=1,f=3;for(let i=0;i<4;i++){v+=amp*(1-Math.abs(Math.sin(a*f+i*1.9)));amp*=.5;f*=2.13;}return v;};
 const notch=a=>1-smooth(.16,.36,Math.abs(a+Math.PI/2));
 const rock=C(.33,.34,.34),forest=C(.1,.15,.11),snow=C(.86,.9,.93),scree=C(.42,.42,.4);
 const col=(snowAt,forestAt)=>(y,a,k,yy)=>{const n=Math.sin(a*37)*3+Math.sin(a*91)*2;return y+n>snowAt?snow:y+n<forestAt?forest:(Math.sin(a*53+y*.2)>.6?scree:rock);};
 // First range overlapping the terrain's edge; the dam notch to the north.
 s.ridge({a0:-Math.PI,a1:Math.PI,seg:420,radius:a=>132+Math.sin(a*3.1)*8,height:a=>(68+jag(a)*24+Math.sin(a*2.2)*10)*(1-notch(a)*.6),profile:[[-40,0],[-24,.32],[-12,.66],[-4,.92],[0,1],[16,.7],[34,.2]],base:-2,color:col(84,44)});
 // Second range: high, glaciated peaks.
 s.ridge({a0:-Math.PI,a1:Math.PI,seg:200,radius:a=>218+Math.sin(a*2.4+1)*14,height:a=>122+jag(a*1.3+2)*44+Math.sin(a*1.7)*18,profile:[[-30,0],[-12,.55],[-4,.92],[0,1],[22,.5]],base:0,color:col(112,52)});
 // The arch dam: a curved concrete wall bowed toward the station, crest road with gate piers, dark spillway
 // chutes; the valley in front of it is carved low (forge.js terrainAt) so it reads from the courtyard.
 {const R=112,a0=-Math.PI/2-.32,a1=-Math.PI/2+.32,seg=40,concrete=C(.64,.64,.61),stain=C(.42,.42,.4),P=(a,r,y)=>[Math.cos(a)*r,y,Math.sin(a)*r];s.kind=CONCRETE;
  for(let i=0;i<seg;i++){const a=a0+(a1-a0)*i/seg,b=a0+(a1-a0)*(i+1)/seg,chute=i>=18&&i<=21,face=chute?stain:concrete;s.kind=chute?WATER:CONCRETE;
   s.quad(P(a,R+9,2),P(b,R+9,2),P(b,R,104),P(a,R,104),face);s.quad(P(a,R,104),P(b,R,104),P(b,R+8,104),P(a,R+8,104),C(.7,.7,.68));s.quad(P(a,R,104),P(b,R,104),P(b,R,105.6),P(a,R,105.6),concrete);
   if(i%4===0){s.kind=CONCRETE;const m=(a+b)/2,[px,,pz]=P(m,R+.5,0);s.box(px,104,pz,2.2,5,2.6,concrete,{yaw:-m-Math.PI/2});}
   // Reservoir behind the crest: still water a metre and a half below the road, a dark line from below.
   s.kind=PLAIN;s.quad(P(a,R+8,102.4),P(b,R+8,102.4),P(b,R+70,102.4),P(a,R+70,102.4),C(.16,.25,.28),{glow:-.1});}
  // Gate house at the toe of the wall, and the surge tower on the left abutment.
  s.box(0,4,-104,26,12,9,C(.66,.64,.6),{top:C(.36,.24,.2)});s.kind=PLAIN;
  s.cyl(Math.cos(a0-.1)*126,92,Math.sin(a0-.1)*126,5,5,26,C(.64,.64,.6),{seg:12});}
 // Summit radio station with its red-and-white mast on the first range's highest crest.
 {let best=0,ba=0;for(let a=-Math.PI;a<Math.PI;a+=.01){const h=(68+jag(a)*24+Math.sin(a*2.2)*10)*(1-notch(a)*.6);if(h>best){best=h;ba=a;}}
  const r=132+Math.sin(ba*3.1)*8,x=Math.cos(ba)*r,z=Math.sin(ba)*r;s.box(x,best-2,z,9,5,6,C(.7,.68,.62),{top:C(.3,.32,.32)});for(let i=0;i<6;i++)s.cyl(x,best+3+i*3,z,.7,.6,3,i%2?C(.86,.86,.84):C(.62,.14,.1),{seg:6,cap:false});}
 return s.mesh('FORGE / orizzonte');
}
const BUILDERS={sahra,caldera,forge};
export function addHorizon(scene,mapId){if(lite||!BUILDERS[mapId]||(typeof location!=='undefined'&&/[?&]horizon=0/.test(location.search)))return null;const mesh=BUILDERS[mapId]();mesh.updateMatrix();scene.add(mesh);return mesh;}
