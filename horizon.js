import * as T from './vendor/three.module.js';
import {SKIES} from './atmosphere.js?v=42.0';
import {streetClock} from './street-props.js?v=42.0';
// V44 surroundings: what lies beyond the playable walls. Each arena gets one merged,
// unlit, vertex-coloured mesh in three depth layers (near roofs or slopes, a mid
// skyline with its landmarks, far ranges) baked with their own aerial perspective,
// so a single draw call reaches the sky. Cosmetic: no shadows, no collision, no hits.
// Phones keep the earlier textures and details (game.js calls useLiteWorld()); since V50 they draw the surroundings too.
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
  // Check Fable: snow is not banded by the rock strata (they drew grey stripes across the far glaciers), and the rock bands are softer.
  float snowy=smoothstep(.42,.55,dot(c,vec3(.333)));c*=mix((.82+.24*strata)*(.88+.18*streak),.97+.05*hzNoise(fp*.02),snowy)*mix(.92+.16*grain,.98+.04*grain,snowy);
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
  // Check Fable: half of the sun shading on these smooth ranges (the ridged normals drew light and dark stripes down every face).
  const put=(i,j)=>{const v=grid[i%R][j],nn=N[i%R][j];this.vertex(v,nn,color(v[1],i,j),.5*this.shade(nn)+.48,0);};
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
 const rand=rng(seed),deco=rng(seed+101);let placed=0;
 for(let n=0;n<count*3&&placed<count;n++){const a=arc[0]+(arc[1]-arc[0])*rand(),rr=r0+(r1-r0)*rand(),x=Math.cos(a)*rr,z=Math.sin(a)*rr;if(bounds&&!outside(x,z,bounds[0],bounds[1],10))continue;
  const w=6+rand()*12,d=6+rand()*12,h=hMin+(hMax-hMin)*Math.pow(rand(),1.8),col=palette[(rand()*palette.length)|0],yaw=a+(rand()-.5)*.25;
  s.kind=FACADE;s.box(x,-1,z,w,h+1,d,col,{yaw});s.kind=PLAIN;s.box(x,h,z,w+.5,.7,d+.5,col.clone().multiplyScalar(1.08),{yaw});
  if(rand()<.45)s.cyl(x+(rand()-.5)*w*.5,h+.7,z+(rand()-.5)*d*.5,1.1,1.1,1.6,C(.62,.6,.56),{seg:6});
  // Check Fable: the blocks were bare boxes. Each now has a darker ground floor, a roof stair-house, and by chance a set-back upper
  // volume (the taller ones), balcony slabs on one face and a parapet wall; its own random stream, so the layout stays as it was.
  {const c=Math.cos(yaw),sn=Math.sin(yaw),at=(u,v)=>[x+c*u+sn*v,z-sn*u+c*v],dk=col.clone().multiplyScalar(.74),lt=col.clone().multiplyScalar(1.12);
   s.box(x,-1,z,w+.3,3.6,d+.3,dk,{yaw});
   {const [px,pz]=at((deco()-.5)*w*.4,(deco()-.5)*d*.4);s.kind=FACADE;s.box(px,h+.7,pz,3.2,2.6,3.2,lt,{yaw});s.kind=PLAIN;s.box(px,h+3.3,pz,3.7,.3,3.7,dk,{yaw});}
   if(h>12&&deco()<.7){const k=.55+deco()*.2,hh=3.5+deco()*7;s.kind=FACADE;s.box(x,h+.7,z,w*k,hh,d*k,col,{yaw});s.kind=PLAIN;s.box(x,h+.7+hh,z,w*k+.5,.6,d*k+.5,lt,{yaw});}
   if(deco()<.6){const side=deco()<.5?-1:1;for(let y=3.4;y<h-1.5;y+=3.3){const [bx,bz]=at(0,side*(d/2+.45));s.box(bx,y,bz,w*.72,.22,.9,lt,{yaw});s.box(bx,y+.22,bz+0,w*.72,.75,.08,dk,{yaw});}}
   for(const sgn of [-1,1]){const [qx,qz]=at(sgn*(w/2+.1),0);s.box(qx,h+.7,qz,.25,.9,d+.5,lt,{yaw});}}
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
// V52 ship-to-shore gantry: box-girder portal on four legs, a lattice boom over the berth (one is stowed raised),
// A-frame with stays, machinery house, cab and a spreader on its ropes. Members between two points are struts.
function strut(s,a,b,w,color,o){const d=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),up=Math.abs(d.y)/d.length()>.9?new T.Vector3(1,0,0):new T.Vector3(0,1,0),p=new T.Vector3().crossVectors(d,up).normalize().multiplyScalar(w/2),q=new T.Vector3().crossVectors(d,p).normalize().multiplyScalar(w/2);
 const c=[[1,1],[1,-1],[-1,-1],[-1,1]].map(([i,j])=>[p.x*i+q.x*j,p.y*i+q.y*j,p.z*i+q.z*j]);
 for(let i=0;i<4;i++){const e=c[i],f=c[(i+1)%4];s.quad([a[0]+e[0],a[1]+e[1],a[2]+e[2]],[a[0]+f[0],a[1]+f[1],a[2]+f[2]],[b[0]+f[0],b[1]+f[1],b[2]+f[2]],[b[0]+e[0],b[1]+e[1],b[2]+e[2]],color,o);}}
function crane(s,x,z,yaw,paint,white,{raised=false,load=null}={}){
 const c=Math.cos(yaw),sn=Math.sin(yaw),W=(u,y,v)=>[x+u*c+v*sn,y,z-u*sn+v*c],dark=C(.13,.15,.17),warn=C(.78,.6,.12);s.kind=PLAIN;
 for(const u of [-9,9])for(const v of [-7,7]){strut(s,W(u,1,v),W(u*.92,35,v),1.7,paint);const [bx,,bz]=W(u,0,v);s.box(bx,.9,bz,3.4,1.6,2.2,dark,{yaw});}
 for(const v of [-7,7]){strut(s,W(-9,6.5,v),W(9,6.5,v),1.5,paint);strut(s,W(-8.3,35,v),W(8.3,35,v),1.9,paint);strut(s,W(-9,7.5,v),W(0,22,v),.8,paint);strut(s,W(9,7.5,v),W(0,22,v),.8,paint);strut(s,W(-8.6,22,v),W(8.6,22,v),1.1,paint);}
 for(const u of [-8.3,8.3]){strut(s,W(u,35,-7),W(u,35,7),1.6,paint);strut(s,W(u*1.06,22,-7),W(u*1.06,22,7),1,paint);}
 // Twin girders: backreach, then the boom hinged at the waterside leg.
 const hinge=-9,tip=raised?[0,36.6+38*.93,hinge-38*.36]:[0,36.6,hinge-40],B=t=>[0,36.6+(tip[1]-36.6)*t,hinge+(tip[2]-hinge)*t];
 for(const u of [-3.6,3.6]){strut(s,W(u,36.6,hinge),W(u,36.6,19),1.5,white);strut(s,W(u,B(0)[1],B(0)[2]),W(u,B(1)[1],B(1)[2]),1.7,white);}
 for(const t of [.02,.26,.5,.74,.98])strut(s,W(-3.6,B(t)[1],B(t)[2]),W(3.6,B(t)[1],B(t)[2]),.7,white);
 strut(s,W(-3.6,B(.93)[1],B(.93)[2]),W(3.6,B(.93)[1],B(.93)[2]),2.4,C(.66,.14,.1));
 // A-frame and stays.
 const apex=[0,56,-4];for(const u of [-3.6,3.6]){strut(s,W(u,36.6,-8.5),W(u*.4,apex[1],apex[2]),1,paint);strut(s,W(u,36.6,7),W(u*.4,apex[1],apex[2]),.9,paint);
  if(!raised)for(const t of [.45,.92])strut(s,W(u*.4,apex[1],apex[2]),W(u,B(t)[1]+.8,B(t)[2]),.28,dark);strut(s,W(u*.4,apex[1],apex[2]),W(u,37.4,18),.28,dark);}
 strut(s,W(-1.5,apex[1],apex[2]),W(1.5,apex[1],apex[2]),1.2,paint);
 // Machinery house, stair tower, cab, spreader.
 {const [mx,,mz]=W(0,0,10);s.kind=RIBBED;s.box(mx,37.4,mz,9.5,5.4,11,white,{yaw,top:C(.34,.36,.38)});s.kind=PLAIN;const [tx,,tz]=W(10.6,0,7);s.box(tx,2,tz,1.6,33,2.2,C(.5,.52,.53),{yaw});}
 if(!raised){const v0=hinge-15,[kx,,kz]=W(2.2,0,v0+5);s.box(kx,31.2,kz,2.6,2.6,3.2,C(.86,.87,.85),{yaw,top:dark});const [qx,,qz]=W(0,0,v0);s.box(qx,35.2,qz,6.4,1.2,4.6,dark,{yaw});
  const drop=load?17:24;for(const u of [-2.6,2.6])for(const v of [-1,1])strut(s,W(u,35.2,v0+v),W(u,drop+.7,v0+v),.14,dark);const [sx,,sz]=W(0,0,v0);s.box(sx,drop,sz,12.4,.7,2.6,warn,{yaw});
  if(load){s.kind=RIBBED;s.box(sx,drop-2.6,sz,12.2,2.6,2.5,load,{yaw});s.kind=PLAIN;}}
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
 const paint=C(.16,.29,.4),white=C(.8,.82,.81),quay=C(.58,.58,.56);
 // Mole and terminal on the far side of the bay (south-west), a long low line on the water.
 const mole=(a,r)=>[Math.cos(a)*r,Math.sin(a)*r];
 s.ridge({a0:1.5,a1:2.58,seg:36,radius:()=>150,height:()=>2.2,profile:[[-9.6,.1],[-9,1],[17,1],[18,.1]],base:-1.3,kind:CONCRETE,color:()=>quay});
 const stacks=[C(.5,.2,.15),C(.17,.29,.38),C(.6,.58,.52),C(.24,.36,.27),C(.62,.42,.17),C(.3,.31,.33),C(.42,.16,.2)],rand=rng(41);
 // Container yard behind the cranes: three rows of forty-footers in blocks with truck lanes between, stacked one to four high.
 s.kind=RIBBED;for(let slot=0;slot<11;slot++){if(slot%4===3)continue;for(let row=0;row<3;row++){const r=158.5+row*3.1,a=1.57+slot*.085+row*.002,[x,z]=mole(a,r),n=Math.max(1,Math.min(4,Math.round(1.2+2.6*Math.abs(Math.sin(slot*1.7+row*.9))+rand()*.9)));
  for(let k=0;k<n;k++)s.box(x,.9+k*2.62,z,12.2,2.6,2.5,stacks[(rand()*stacks.length)|0],{yaw:-a+Math.PI/2+(rand()-.5)*.012});}}
 // Terminal shed at the root of the mole and high-mast lights along the yard.
 {const a=2.5,[x,z]=mole(a,154);s.box(x,.9,z,30,8.5,13,C(.62,.64,.62),{yaw:-a+Math.PI/2,top:C(.36,.4,.42)});}s.kind=PLAIN;
 for(const a of [1.6,1.84,2.08,2.32]){const [x,z]=mole(a,166.4);s.cyl(x,.9,z,.42,.26,33,C(.6,.62,.62),{seg:6,cap:false});s.cyl(x,33.9,z,1.9,1.9,.7,C(.82,.83,.8),{seg:8});}
 crane(s,...mole(1.7,147),-1.7+Math.PI/2,paint,white,{load:stacks[1]});crane(s,...mole(1.89,147),-1.89+Math.PI/2,paint,white);crane(s,...mole(2.1,147),-2.1+Math.PI/2,paint,white,{raised:true});
 // A container carrier at the berth: flared bow, boot-topping at the waterline, accommodation block and funnel aft, boxes in bays.
 {const a=1.84,[x,z]=mole(a,129.5),yaw=-a+Math.PI/2,c=Math.cos(yaw),sn=Math.sin(yaw),W=(u,y,v)=>[x+u*c+v*sn,y,z-u*sn+v*c],hull=C(.1,.14,.19),boot=C(.42,.14,.1),deck=C(.36,.2,.16);
  const st=[[-56,5.2,9.6],[-52,7.2,9.4],[-40,7.6,9.2],[20,7.6,9.2],[34,7.1,9.4],[44,5.4,10],[51,2.8,10.8],[56,.25,11.8]];s.kind=PLAIN;
  for(let i=0;i<st.length-1;i++){const [u0,b0,d0]=st[i],[u1,b1,d1]=st[i+1];for(const sd of [-1,1]){s.quad(W(u0,-1.3,sd*b0*.86),W(u1,-1.3,sd*b1*.86),W(u1,1.1,sd*b1*.93),W(u0,1.1,sd*b0*.93),boot);s.quad(W(u0,1.1,sd*b0*.93),W(u1,1.1,sd*b1*.93),W(u1,d1,sd*b1),W(u0,d0,sd*b0),hull);}
   s.quad(W(u0,d0,-b0),W(u1,d1,-b1),W(u1,d1,b1),W(u0,d0,b0),deck);}
  s.quad(W(-56,-1.3,-4.5),W(-56,-1.3,4.5),W(-56,9.6,5.2),W(-56,9.6,-5.2),hull);
  {const [bx,,bz]=W(-43,0,0);s.kind=FACADE;s.box(bx,9.4,bz,10,16.5,14.4,C(.86,.87,.84),{yaw});s.kind=PLAIN;s.box(bx,25.9,bz,5.4,2.8,19.6,C(.86,.87,.84),{yaw,top:C(.3,.32,.34)});s.cyl(bx,28.7,bz,.3,.2,7,C(.8,.8,.78),{seg:5,cap:false});
   const [fx,,fz]=W(-51,0,0);s.box(fx,9.4,fz,4.4,13,5.4,C(.16,.18,.2),{yaw});s.box(fx,19.4,fz,4.6,1.6,5.6,C(.7,.52,.16),{yaw});}
  s.kind=RIBBED;for(let bay=0;bay<11;bay++){const u=-33+bay*6.7;for(const [v,wd]of [[-4.9,4.8],[0,5],[4.9,4.8]]){const tiers=bay>9?1:Math.max(1,Math.round(2.4+1.8*Math.sin(bay*.9+v)+rand()*1.3));const [cx,,cz]=W(u,0,v);for(let k=0;k<tiers;k++)s.box(cx,9.3+k*2.62,cz,6.1,2.6,wd,stacks[(rand()*stacks.length)|0],{yaw});}}
  s.kind=PLAIN;{const [mx,,mz]=W(50,0,0);s.cyl(mx,10.6,mz,.3,.18,9,C(.8,.8,.78),{seg:5,cap:false});}}
 // Islands on the open sea, low and very hazy.
 for(const [a,r,w,h]of [[2.9,262,40,14],[3.25,280,64,22],[1.2,270,50,12]])s.ridge({a0:a-w/r/2,a1:a+w/r/2,seg:12,radius:()=>r,height:b=>h*Math.max(0,Math.sin((b-a+w/r/2)/(w/r)*Math.PI))**.7-1.3,profile:[[-14,0],[-4,.8],[0,1],[10,0]],base:-1.3,color:()=>C(.34,.38,.36)});
 // Second range behind the rim, bluer and higher.
 s.ridge({a0:-Math.PI*.98,a1:Math.PI*.42,seg:140,radius:a=>222+Math.sin(a*2.7)*10,height:a=>(34+Math.sin(a*4.1+1)*9+Math.sin(a*9.3)*5+Math.abs(Math.sin(a*17))*3)*smooth(0,.34,Math.PI*.42-a)*smooth(0,.34,a+Math.PI*.98)-3*(1-smooth(0,.1,Math.PI*.42-a)),profile:[[-20,0],[-6,.75],[0,1],[30,.4]],base:-3,color:()=>C(.34,.36,.38)});
 // The volcano: a smooth stratocone with radial gullies and ridges, a crater lip and a thin plume, north.
 // Check Fable: the rim is open toward the station (da>0 wraps the angle), lava glows in the crater and runs down the upper gullies.
 {const x=-42,z=-236,AS=128,RS=18,rimGap=a=>{const da=Math.atan2(Math.sin(a-1.39),Math.cos(a-1.39));return Math.exp(-da*da/.2);},gully=(a,t)=>Math.pow(Math.abs(Math.sin(a*9+Math.sin(a*2.7)*1.8+t*1.6)),5)*Math.sin(Math.PI*Math.min(1,t*1.3))*t,outer=[],inner=[];
  for(let i=0;i<AS;i++){const a=i/AS*Math.PI*2,row=[],cr=[];
   for(let j=0;j<=RS;j++){const t=j/RS,r=(15+94*Math.pow(t,1.38))*(1+Math.sin(a*3+.5)*.05+Math.sin(a*7)*.022)+gully(a,t)*8;row.push([x+Math.cos(a)*r,86*Math.pow(1-t,1.6)-3+Math.sin(a*5)*1.4*(1-t)-gully(a,t)*3-rimGap(a)*15*Math.pow(1-t,4)+Math.sin(a*2+1)*5*t*(1-t)*4*.4,z+Math.sin(a)*r]);}
   for(const [r,y]of [[15*(1+Math.sin(a*3+.5)*.05+Math.sin(a*7)*.022),83+Math.sin(a*5)*1.4-rimGap(a)*15],[10,70],[4,66]])cr.push([x+Math.cos(a)*r,y,z+Math.sin(a)*r]);
   outer.push(row);inner.push(cr);}
  // The landmark keeps more of its own colour through the haze than the ranges around it.
  s.kind=ROCK;s.clear=.5;
  // Dark basalt above, ash fans below, banded by old eruptions; lava ribs darker still.
  s.surface(outer,(y,i,j)=>{const a=i/AS*Math.PI*2,t=j/RS,g=gully(a,t),upper=1-smooth(.15,.55,t),band=.5+.5*Math.sin(y*.42+Math.sin(a*3)*2.2);
   const base=C(.5,.45,.39).lerp(C(.19,.17,.16),upper).lerp(C(.3,.24,.2),band*.35*(1-upper*.5));{const lim=a>1.39?.62:.36;if(g>.3&&t<lim&&rimGap(a)>.25)return C(1.5,.42,.08).lerp(C(.42,.1,.04),t/lim);}return g>.35?base.clone().multiplyScalar(.58):g<.05&&t>.3?base.clone().lerp(C(.58,.53,.46),.35):base;},{wrap:true});
  s.surface(inner,y=>y<75?C(1.9,.6,.1):C(.5,.16,.06),{wrap:true});s.kind=PLAIN;s.clear=1;
  s.plume=[x,84,z];}
 const mesh=s.mesh('CALDERA / orizzonte');mesh.add(plume(s.plume,s.haze));return mesh;
}
// V52 sea surface: a long swell under wind chop made of drifting noise (no regular stripes), its normal drawn per pixel so the
// sky and the sun break into glints; deep blue offshore, greener over the shallows by the quay, crests catching light,
// and the far water dissolving into the horizon haze so sea and sky meet without a line.
export function seaSurface(material){
 if(lite)return material;const previous=material.onBeforeCompile,key=material.customProgramCacheKey?.()||'',haze=C(...SKIES.caldera.horizon).multiplyScalar(.97);
 material.onBeforeCompile=function(shader,renderer){previous?.call(this,shader,renderer);shader.uniforms.uSeaClock=streetClock;shader.uniforms.uSeaHaze={value:haze};
  shader.vertexShader='varying vec3 vSeaW;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSeaW=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader='uniform float uSeaClock;uniform vec3 uSeaHaze;varying vec3 vSeaW;\n'+DETAIL+`
float seaH(vec2 p){float t=uSeaClock;vec2 w=p+vec2(hzNoise(p*.05+t*.02),hzNoise(p*.05+7.-t*.02))*5.;
 return sin(dot(w,vec2(.11,.07))+t*.7)*.5+sin(dot(w,vec2(-.05,.16))+t*.9)*.28+hzNoise(w*.32+vec2(t*.22,t*.1))*.55+hzNoise(w*.83+vec2(-t*.3,t*.42))*.28;}
float seaChop(vec2 p){float t=uSeaClock;return hzNoise(p*2.1+vec2(t*.7,-t*.5))*.6+hzNoise(p*4.7+vec2(-t*.9,t*1.1))*.4;}
`+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float seaD=length(vViewPosition),seaFar=smoothstep(140.,330.,seaD);
{float shore=1.-smoothstep(34.,95.,length(vSeaW.xz));float tone=hzNoise(vSeaW.xz*.012+uSeaClock*.004);
 diffuseColor.rgb=mix(vec3(.004,.026,.05),vec3(.012,.085,.095),shore*.8+tone*.2);}`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
{vec2 p=vSeaW.xz;float e=.18+seaD*.004;float h0=seaH(p);vec2 g=vec2(seaH(p+vec2(e,0.))-h0,seaH(p+vec2(0.,e))-h0)/e;
 float near=1.-smoothstep(8.,70.,seaD);if(near>0.){float c0=seaChop(p);g+=vec2(seaChop(p+vec2(.07,0.))-c0,seaChop(p+vec2(0.,.07))-c0)/.07*.045*near;}
 float fade=1.-smoothstep(60.,300.,seaD)*.8;vec3 wn=normalize(vec3(-g.x*.42*fade,1.,-g.y*.42*fade));normal=normalize((viewMatrix*vec4(wn,0.)).xyz);
 // Lifted crests are lighter and a little rougher, like wind-ruffled water.
 float crest=smoothstep(.55,1.25,h0);diffuseColor.rgb+=vec3(.012,.035,.04)*crest*(1.-seaFar);}`).replace('#include <tonemapping_fragment>',`gl_FragColor.rgb=mix(gl_FragColor.rgb,uSeaHaze*(.92+.1*dot(gl_FragColor.rgb,vec3(.333))),seaFar*seaFar*(3.-2.*seaFar)*.97);
#include <tonemapping_fragment>`);};
 material.fog=false;material.customProgramCacheKey=()=>key+'-sea52';return material;
}
// ---------------------------------------------------------------- FORGE
// Alpine head of valley: a forested first range, the arch dam filling the notch to
// the north with its crest road and spillway, a summit radio station, and snowy
// peaks fading into blue haze behind.
// V52 Forge massif: one heightfield from the courtyard wall to the far ranges (true scale: summits 600-1000 m
// above the plant, 1-2.5 km away), drawn by its own unlit shader. Per pixel: bedded rock, scree, alpine grass,
// fir and larch canopy thinning at the tree line, snow that holds on shelves and lets cliffs show through;
// sun shadows cast by the peaks are baked per vertex; haze thickens with distance and pools low in the valleys.
// The depth of anything beyond three quarters of the far plane is compressed, so the range needs no longer frustum.
const alpHash=(x,z)=>{let h=Math.imul(x|0,374761393)^Math.imul(z|0,668265263);h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
const alpNoise=(x,z)=>{const xi=Math.floor(x),zi=Math.floor(z),fx=x-xi,fz=z-zi,u=fx*fx*fx*(fx*(fx*6-15)+10),v=fz*fz*fz*(fz*(fz*6-15)+10),a=alpHash(xi,zi),b=alpHash(xi+1,zi),c=alpHash(xi,zi+1),d=alpHash(xi+1,zi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};
const alpRidged=(x,z,oct)=>{let sum=0,amp=.5,w=1;for(let i=0;i<oct;i++){let n=1-Math.abs(2*alpNoise(x+i*17.3,z-i*9.1)-1);n*=n*w*Math.min(1,oct-i);w=Math.min(1,Math.max(.15,n*2.4));sum+=n*amp;amp*=.5;const nx=(x*.8-z*.6)*2.07,nz=(x*.6+z*.8)*2.07;x=nx;z=nz;}return sum;};
const ALP_DAM=-Math.PI/2,ALP_OPEN=.95;
function alpField(terrainAt){
 return (x,z,oct=7)=>{
  const r=Math.hypot(x,z),a=Math.atan2(z,x),near=r<230?terrainAt(x,z):0;if(r<104)return near;
  const wx=x+(alpNoise(x/430+3.1,z/430)-.5)*280,wz=z+(alpNoise(x/430-7.7,z/430+5.2)-.5)*280,m=alpRidged(wx/820+11.3,wz/820-4.7,Math.min(oct,Math.max(2.3,Math.log(820/((lite?.27:.19)*r))/.7275+1)));
  // A side valley opens to the south-east and lets the eye run to the far ranges.
  const dv=Math.atan2(Math.sin(a-ALP_OPEN),Math.cos(a-ALP_OPEN)),open=Math.exp(-((dv/.42)**2))*(1-smooth(1500,2500,r));
  const env=smooth(100,1150,r)*(1-.72*open),crown=smooth(1300,2400,r);
  let h=26+env*250+m*(120+env*860)+crown*m*260-open*14;
  h=near+(h-near)*smooth(104,230,r);
  // Rock abutments on both sides of the dam notch.
  const dd=Math.abs(Math.atan2(Math.sin(a-ALP_DAM),Math.cos(a-ALP_DAM))),ab=smooth(.23,.33,dd)*(1-smooth(.62,1.05,dd))*smooth(99,117,r)*(1-smooth(210,330,r));
  return Math.max(h,ab*(96+m*60+alpRidged(x/120+2.2,z/120-8.4,4)*74+alpNoise(x/17,z/17)*8));
 };
}
const ALP_VERT=`attribute vec3 data;varying vec3 vAw,vAn,vAd;
void main(){vAd=data;vAn=normal;vec4 w=modelMatrix*vec4(position,1.);vAw=w.xyz;vec4 mv=viewMatrix*w;vec4 clip=projectionMatrix*mv;
 float A=projectionMatrix[2][2],B=projectionMatrix[3][2],far=B/(A+1.),zv=-mv.z,T=far*.72;
 if(zv>T){float ze=T+far*.26*(1.-exp(-(zv-T)/900.));clip.z=(A*(-ze)+B)*zv/ze;}
 gl_Position=clip;}`;
const ALP_FRAG=`uniform vec3 aSun,aHaze,aSunCol;uniform vec4 aClimate;uniform float aAir;varying vec3 vAw,vAn,vAd;`+DETAIL+`
vec2 alpGrad(vec2 p){float e=.35;return vec2(hzNoise(p+vec2(e,0))-hzNoise(p-vec2(e,0)),hzNoise(p+vec2(0,e))-hzNoise(p-vec2(0,e)));}
void main(){
 vec3 n=normalize(vAn),ray=vAw-cameraPosition;float d=length(ray);vec3 v=ray/d;vec3 q3=vAw*aClimate.z;vec2 p=q3.xz;float y=q3.y,px=d*.0019*aClimate.z;vec3 col;float sh=vAd.x;
 if(vAd.z>.5){
  // Fir or larch standing clear of the canopy.
  vec3 leaf=vAd.y>.86?vec3(.17,.105,.03):mix(vec3(.014,.032,.02),vec3(.04,.07,.032),vAd.y);
  float sun=max(dot(n,aSun)*.75+.25,0.)*sh;col=leaf*(aSunCol*sun*1.5+vec3(.3,.38,.5)*(.35+.4*vAd.y));
 }else{
  // Crags the mesh cannot carry: three bands of relief, each fading out before it turns into shimmer.
  float f1=1.-smoothstep(6.,20.,px),f2=1.-smoothstep(1.2,4.,px),f3=1.-smoothstep(.25,.9,px);
  vec2 g=alpGrad(p/46.)*1.5*f1+alpGrad(p/11.+3.7)*.9*f2+alpGrad(p/2.6+9.1)*.55*f3;
  float steep=1.-n.y;vec3 nn=normalize(n-vec3(g.x,0.,g.y)*(.35+1.5*steep));float slope=1.-nn.y;
  float lowN=hzNoise(p/95.),midN=hzNoise(p/23.+5.),fine=hzNoise(p/3.1)*f3+.5*(1.-f3);
  float aspect=dot(normalize(n.xz+vec2(1e-4)),normalize(aSun.xz))*smoothstep(.02,.3,steep);
  // Rock: dipping beds, joints running down the face, lichen and iron stains.
  float bed=y*.085+dot(p,vec2(.027,.015))+lowN*4.;float st=hzNoise(vec2(bed,bed*.31+lowN));
  vec2 dn=normalize(n.xz+vec2(1e-4));float run=hzNoise(vec2(dot(p,vec2(dn.y,-dn.x))*.22,y*.018+lowN));
  // Cliffs are read on their own faces (projected from the side they turn to): fracture blocks, vertical joints, ledges.
  vec2 tw=n.xz*n.xz+1e-4;tw/=tw.x+tw.y;
  float blocks=hzNoise(q3.zy*vec2(.055,.04)+lowN*2.)*tw.x+hzNoise(q3.xy*vec2(.055,.04)+lowN*2.)*tw.y;
  float joints=hzNoise(q3.zy*vec2(.36,.045)+7.)*tw.x+hzNoise(q3.xy*vec2(.36,.045)+7.)*tw.y;
  float ledge=hzNoise(q3.zy*vec2(.028,.17)+3.+lowN*3.)*tw.x+hzNoise(q3.xy*vec2(.028,.17)+3.+lowN*3.)*tw.y;
  vec3 rock=mix(vec3(.095,.1,.11),vec3(.3,.29,.27),blocks*.55+st*.25+fine*.2);rock=mix(rock,vec3(.26,.2,.14),smoothstep(.55,.85,hzNoise(p/160.+2.))*.45);
  rock=mix(rock,rock*mix(vec3(.62,.56,.52),vec3(.98,.62,.4),smoothstep(.35,.7,lowN))+vec3(.01,.004,0.),aClimate.w);rock*=(.82+.36*run)*(1.-.5*(1.-smoothstep(0.,.08,abs(joints-.5)))*f2)*(1.-.42*(1.-smoothstep(0.,.1,abs(ledge-.5)))*f2)*mix(1.,.7+.6*hzNoise(p/9.+vec2(y*.11,3.7)),f2);
  nn=normalize(nn+vec3(n.z,0.,-n.x)*(blocks-.5)*1.1*steep*f1);
  vec3 scree=mix(vec3(.25,.25,.245),vec3(.4,.39,.37),run*.6+fine*.4);
  vec3 grass=mix(vec3(.085,.1,.04),vec3(.2,.16,.065),smoothstep(.3,.75,midN*.6+lowN*.4+y*.0012))*(.8+.4*fine);
  float crag=smoothstep(.34,.56,slope+(midN-.5)*.16);
  col=mix(grass,scree,smoothstep(.22,.36,slope+(lowN-.5)*.2)*smoothstep(60.,150.,y+(lowN-.5)*80.));col=mix(col,rock,crag);
  // Forest: dense in the valley, breaking into groups and single trees toward the tree line; larches turn gold.
  float treeLine=aClimate.y+aspect*26.+(lowN-.5)*80.;
  float stand=(1.-smoothstep(treeLine-70.,treeLine,y+(midN-.5)*46.))*(1.-smoothstep(.4,.6,slope));
  float thin=smoothstep(treeLine-110.,treeLine-10.,y);stand*=smoothstep(.18+.3*thin,.4+.3*thin,hzNoise(p/34.+9.)*.7+midN*.3+.12);
  if(stand>.01){
   vec2 c=p/6.2,id=floor(c);vec2 o=vec2(hzHash(id),hzHash(id+7.3))-.5;vec2 q=fract(c)-.5-o*.5;float crown=1.-smoothstep(.16,.46,length(q));
   float side=clamp(.5-dot(q,normalize(aSun.xz))*1.6,0.,1.),gold=step(.84,hzHash(id+3.1))*(1.-aClimate.w);float canopy=1.-smoothstep(1.,3.2,px);
   vec3 fir=mix(vec3(.012,.026,.017),vec3(.05,.085,.035),side);fir=mix(fir,mix(vec3(.09,.06,.02),vec3(.22,.15,.045),side),gold);
   vec3 far=mix(vec3(.022,.042,.024),vec3(.1,.075,.025),smoothstep(.62,.8,hzNoise(p/19.+4.))*.6)*(.75+.5*midN);
   vec3 wood=mix(far,mix(col*.45,fir,crown),canopy*smoothstep(95.,150.,d));
   // Close to the plant the modelled firs stand on needle litter and moss instead of a painted canopy.
   wood=mix(mix(vec3(.05,.058,.03),vec3(.1,.09,.05),fine)*(.8+.4*midN),wood,smoothstep(95.,150.,d));
   col=mix(col,wood,stand);nn=normalize(mix(nn,n,stand*.6));
  }
  // Snow: a line that climbs on the sunny side, held by shelves and gullies, shed by the steep faces.
  float snowLine=aClimate.x+aspect*46.+(lowN-.5)*110.+(midN-.5)*34.;
  float snow=smoothstep(snowLine-30.,snowLine+40.,y)*(1.-smoothstep(.4,.66,slope+(midN-.5)*.14+(fine-.5)*.08));
  snow=max(snow,smoothstep(snowLine-120.,snowLine-40.,y)*smoothstep(.62,.8,lowN*.5+midN*.5-aspect*.12)*(1.-smoothstep(.3,.5,slope)));
  col=mix(col,vec3(.8,.84,.88)*(.94+.1*fine),snow);
  float ndl=max(dot(nn,aSun),0.);ndl=mix(ndl,ndl*.6+.3,snow*.5);
  vec3 sky=vec3(.3,.39,.55)*(.5+.5*nn.y)*vAd.y*(.8+.5*clamp(dot(nn.xz,-normalize(aSun.xz)),-.4,1.)*(1.-nn.y));
  col*=aSunCol*ndl*sh*1.25+sky+vec3(.1,.09,.075)*(1.-nn.y)*sh;
  col+=aSunCol*pow(max(dot(reflect(aSun,nn),v),0.),14.)*.22*snow*sh;
 }
 // Air: a uniform veil plus haze that pools low, brighter toward the sun.
 float dy=max(vAw.y-cameraPosition.y,1.)/130.;float opt=aAir*d*(1./3900.+(1./1250.)*(1.-exp(-dy))/dy);float k=1.-exp(-opt);
 float sunward=pow(max(dot(v,aSun),0.),4.)*smoothstep(150.,900.,d);vec3 veil=aHaze*(1.+.35*sunward);float l=dot(col,vec3(.3,.59,.11));
 col=mix(mix(col,vec3(l),k*.3),veil*mix(.86,1.1,clamp(l*2.,0.,1.)),min(k,.9));
 gl_FragColor=vec4(col,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
// The same rock, scrub and haze for any relief: climate = [snow line, tree line, pattern scale, volcanic 0-1] (geometry needs normal and data = [sun, sky, 0]).
export function massifMaterial({sun,haze,climate=[262,188,1,0],air=1}){
 const m=new T.ShaderMaterial({vertexShader:ALP_VERT,fragmentShader:ALP_FRAG,side:T.DoubleSide,fog:false,uniforms:{aSun:{value:sun},aHaze:{value:haze},aSunCol:{value:new T.Vector3(1.,.93,.83)},aClimate:{value:new T.Vector4(...climate)},aAir:{value:air}}});m.extensions={derivatives:true};m.userData.nonBallistic=true;m.userData.horizon=true;return m;
}
export const calderaRimMaterial=()=>massifMaterial({sun:new T.Vector3(-72,64,34).normalize(),haze:C(...SKIES.caldera.horizon).multiplyScalar(1.02),climate:[1e5,118,4.5,1],air:2.4});
function forgeAlps(terrainAt,sunArr,haze){
 const H=alpField(terrainAt),sun=new T.Vector3(...sunArr).normalize(),NA=lite?208:264,NR=lite?52:66,R0=27.5,R1=2650,TREES=lite?520:1150;
 const pos=[],nor=[],dat=[],idx=[],ring=j=>R0*Math.pow(R1/R0,Math.pow(j/NR,1.12));
 const shadow=(x,y,z)=>{let s=1;for(let k=0;k<17&&s>0;k++){const t=7*Math.pow(1.38,k),gap=y+1.5+sun.y*t-H(x+sun.x*t,z+sun.z*t,4);if(gap<0)s=Math.min(s,Math.max(0,1+gap/(t*.14)));}return s;};
 const normal=(x,z,r)=>{const e=Math.max(1.2,r*.011);return [H(x-e,z)-H(x+e,z),2*e,H(x,z-e)-H(x,z+e),e];};
 for(let j=0;j<=NR;j++){const r=ring(j);for(let i=0;i<NA;i++){const a=(i+(j%2)*.5)/NA*Math.PI*2,x=Math.cos(a)*r,z=Math.sin(a)*r,y=H(x,z),[nx,ny,nz,e]=normal(x,z,r),l=Math.hypot(nx,ny,nz);
  const e3=e*3,lap=(H(x-e3,z,5)+H(x+e3,z,5)+H(x,z-e3,5)+H(x,z+e3,5))/4-y;
  pos.push(x,y,z);nor.push(nx/l,ny/l,nz/l);dat.push(r<34?1:shadow(x,y,z),Math.max(.45,Math.min(1.12,1-lap/e3*1.4)),0);}}
 for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const a=j*NA+i,b=j*NA+(i+1)%NA,c=a+NA,d=b+NA;if(j%2)idx.push(a,c,b,b,c,d);else idx.push(a,d,b,a,c,d);}
 // Firs and larches as two stacked cones where the wood is thick enough to break the skyline.
 const rand=rng(5211);let base=pos.length/3;
 for(let n=0,tries=0;n<TREES&&tries<40000;tries++){const a=rand()*Math.PI*2,r=106*Math.pow(690/106,Math.pow(rand(),1.25)),x=Math.cos(a)*r,z=Math.sin(a)*r,y=H(x,z);
  const dd=Math.abs(Math.atan2(Math.sin(a-ALP_DAM),Math.cos(a-ALP_DAM)));if(dd<.4&&r<135)continue;
  const [nx,ny,nz]=normal(x,z,r),up=ny/Math.hypot(nx,ny,nz),line=178+(alpNoise(x/95,z/95)-.5)*70;if(up<.78||y>line||rand()<(y-(line-90))/90)continue;
  const h=(9+rand()*7)*(1-.35*Math.max(0,(y-(line-90))/90))*(1+r/900),s=shadow(x,y+h*.6,z),tint=rand()<.09?.9+rand()*.1:rand()*.8,yaw=rand()*6.28;
  for(const [y0,y1,rad]of [[.06,.68,.21],[.4,1,.14]]){const b=pos.length/3;pos.push(x,y+h*y1-.6,z);nor.push(0,1,0);dat.push(s,tint,1);
   for(let k=0;k<6;k++){const t=yaw+k/6*Math.PI*2,cx=Math.cos(t),cz=Math.sin(t);pos.push(x+cx*h*rad,y+h*y0-.6,z+cz*h*rad);nor.push(cx*.92,.38,cz*.92);dat.push(s,tint,1);}
   for(let k=0;k<6;k++)idx.push(b,b+1+k,b+1+(k+1)%6);}
  n++;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('data',new T.Float32BufferAttribute(dat,3));g.setIndex(idx);
 const m=massifMaterial({sun,haze});
 const mesh=new T.Mesh(g,m);mesh.name='FORGE / massiccio';mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=false;mesh.matrixAutoUpdate=false;mesh.renderOrder=6;mesh.userData.cosmetic=true;mesh.userData.keep=true;mesh.userData.horizon=true;mesh.userData.heightAt=H;return mesh;
}
// Distant lamps: warm (0) or red blinking (1) points, a few pixels wide whatever the distance.
function forgeLamps(list){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(list.flatMap(l=>l.slice(0,3)),3));g.setAttribute('tone',new T.Float32BufferAttribute(list.map(l=>l[3]),1));
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,fog:false,blending:T.AdditiveBlending,uniforms:{hzTime:streetClock},
  vertexShader:`attribute float tone;varying float vTone;void main(){vTone=tone;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(520./-mv.z,3.,7.);}`,
  fragmentShader:`uniform float hzTime;varying float vTone;void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.15,1.,r));a*=a;float blink=vTone>.5?.35+.65*smoothstep(.0,.2,sin(hzTime*2.1)):1.;
 gl_FragColor=vec4((vTone>.5?vec3(1.6,.12,.06):vec3(1.5,1.15,.7))*a*blink,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});m.userData.nonBallistic=true;
 const p=new T.Points(g,m);p.frustumCulled=false;p.renderOrder=7;p.userData.cosmetic=p.userData.keep=true;p.name='FORGE / luci';return p;
}
function forge({terrainAt=()=>0}={}){
 const s=new Silhouette(SKIES.forge,[-23.4,23.2,3],{density:.0029,mist:.1});
 const jag=a=>{let v=0,amp=1,f=3;for(let i=0;i<4;i++){v+=amp*(1-Math.abs(Math.sin(a*f+i*1.9)));amp*=.5;f*=2.13;}return v;};
 const notch=a=>1-smooth(.16,.36,Math.abs(a+Math.PI/2));
 const rock=C(.33,.34,.34),forest=C(.1,.15,.11),snow=C(.86,.9,.93),scree=C(.42,.42,.4);
 const col=(snowAt,forestAt)=>(y,a,k,yy)=>{const n=Math.sin(a*37)*3+Math.sin(a*91)*2;return y+n>snowAt?snow:y+n<forestAt?forest:(Math.sin(a*53+y*.2)>.6?scree:rock);};
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
 // V52: the massif itself (heightfield, forest, snow) is its own mesh; the station, the cableway and the lights sit on it.
 const alps=forgeAlps(terrainAt,[-23.4,23.2,3],s.haze),H=alps.userData.heightAt,lamps=[];
 // Summit radio station with its red-and-white mast on the highest shoulder within reach of the cableway.
 let best=0,sx=0,sz=0;for(let a=-Math.PI;a<Math.PI;a+=.012)for(const r of [138,150,162]){const d=Math.abs(Math.atan2(Math.sin(a+Math.PI/2),Math.cos(a+Math.PI/2)));if(d<1.15)continue;const x=Math.cos(a)*r,z=Math.sin(a)*r,h=H(x,z);if(h>best){best=h;sx=x;sz=z;}}
 {const yaw=-Math.atan2(sz,sx);s.kind=CONCRETE;s.box(sx,best-6,sz,11,7.5,7,C(.66,.64,.6),{yaw,top:C(.3,.32,.33)});s.kind=RIBBED;s.box(sx,best+1.5,sz,7,2.6,5,C(.5,.52,.5),{yaw,top:C(.26,.27,.28)});s.kind=PLAIN;
  for(let i=0;i<8;i++)s.cyl(sx+3,best+1.5+i*3,sz+2,.55,.5,3,i%2?C(.86,.86,.84):C(.62,.14,.1),{seg:6,cap:false});for(const y of [10,17])s.cyl(sx+3,best+y,sz+2,1.5,1.5,.5,C(.8,.8,.78),{seg:8});
  lamps.push([sx+3,best+26,sz+2,1],[sx+3,best+13.5,sz+2,1],[sx,best+2,sz,0]);
  // Cableway from the plant yard to the station: two lattice towers, a cabin on the rope.
  const bx=26,bz=30,by=terrainAt(bx,bz)+5,top=[sx*.96,best+3.4,sz*.96],at=t=>[bx+(top[0]-bx)*t,0,bz+(top[2]-bz)*t],pts=[],stops=[[bx,by,bz]];
  s.box(bx,by-6,bz,5,7,7,C(.6,.6,.57),{yaw,top:C(.3,.2,.16)});
  for(const t of [.34,.7]){const [x,,z]=at(t),g=H(x,z);s.kind=TRUSS;s.box(x,g-1,z,2.6,15,2.6,C(.5,.53,.52),{yaw});s.kind=PLAIN;s.box(x,g+14,z,6.4,.7,1.4,C(.56,.58,.57),{yaw});stops.push([x,g+15,z]);lamps.push([x,g+15.6,z,1]);}
  stops.push(top);
  for(let i=0;i<stops.length-1;i++){const p=stops[i],q=stops[i+1];for(let k=0;k<10;k++)for(const t of [k/10,(k+1)/10])for(const off of [-1.6,1.6])pts.push(p[0]+(q[0]-p[0])*t+Math.sin(yaw)*off,p[1]+(q[1]-p[1])*t-4*t*(1-t)*2.2,p[2]+(q[2]-p[2])*t+Math.cos(yaw)*off);}
  {const p=stops[1],q=stops[2],t=.42,cx=p[0]+(q[0]-p[0])*t+Math.sin(yaw)*1.6,cy=p[1]+(q[1]-p[1])*t-4*t*(1-t)*2.2,cz=p[2]+(q[2]-p[2])*t+Math.cos(yaw)*1.6;s.box(cx,cy-4.1,cz,2.3,2.5,3.4,C(.66,.16,.1),{yaw,top:C(.84,.84,.82)});s.box(cx,cy-1.6,cz,.25,1.6,.25,C(.2,.21,.22),{yaw});}
  const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(pts,3));const lm=new T.LineBasicMaterial({color:0x23282b,fog:false});lm.userData.nonBallistic=true;s.ropes=new T.LineSegments(lg,lm);s.ropes.frustumCulled=false;s.ropes.userData.cosmetic=s.ropes.userData.keep=true;}
 // Crest lamps on the dam and obstruction lights on the tower: small, steady points that give the wall its size.
 for(let i=0;i<=40;i+=4){const a=-Math.PI/2-.32+.64*i/40;lamps.push([Math.cos(a)*112.5,109.6,Math.sin(a)*112.5,0]);}
 lamps.push([Math.cos(-Math.PI/2-.42)*126,118.6,Math.sin(-Math.PI/2-.42)*126,1]);
 const mesh=s.mesh('FORGE / orizzonte');mesh.add(alps,s.ropes,forgeLamps(lamps));return mesh;
}
const BUILDERS={sahra,caldera,forge};
// V50: phones get the surroundings too (one or two unlit draw calls, 7-20k triangles); they keep the lighter textures and details.
export function addHorizon(scene,mapId,options){if(!BUILDERS[mapId]||(typeof location!=='undefined'&&/[?&]horizon=0/.test(location.search)))return null;const mesh=BUILDERS[mapId](options);mesh.updateMatrix();scene.add(mesh);return mesh;}
