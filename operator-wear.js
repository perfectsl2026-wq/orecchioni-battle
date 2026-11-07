// V43 oR: the classic kits' own clothing. ASSALTO, SFONDAMENTO, TIRATORE and RICOGNIZIONE no longer share the bought-in
// vest, pouches and pads of the soldier: each wears its own cut, built here once per kit from the body itself. Every panel
// follows the suit's surface (a radial map of the suit around the torso, a limb or the head) and every vertex takes the skin
// weights of the suit under it, so the wear bends with the operator as the suit does. One operator's wear is one skinned
// mesh, one draw: a palette index per vertex picks colour, roughness, metalness and weave, and the palette is shared per team
// and accent (one program for every kit). The suit under it keeps its folds and takes the kit's own colour blocking.
// V43 oR rev: the suit is tucked in under the wear (a per-kit weight pushes it 16 mm in along its normal), so its folds never
// poke through a panel or fray a rim; the maps are smoothed as an envelope (never more than 14 mm under the suit), so plates
// are smooth shells, not lumps; cloth takes a woven relief, a mottle, darker seams and top stitching, hard shells worn edges.
// Positions are authored in metres in the soldier's bind space (A pose, +y up, +z the front, +x the left hand).
import * as T from './vendor/three.module.js';
import {mergeGeometries,mergeVertices} from './vendor/addons/utils/BufferGeometryUtils.js';
import {PAINTS} from './weapon-finish.js?v=42.0';
export const WEAR_KITS=new Set(['assalto','sfondamento','tiratore','ricognizione','mastino']);
const U=1.1e6,R=Math.PI/180,TUCK=.016,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const boneName=n=>n.replace(/^mixamorig[:_]?/,'').replace(/_\d+$/,'');
// ---- palette: one slot per kind of surface --------------------------------------------------
// M team cloth, D team dark cloth, W charcoal webbing, H hard shell in the team tone, A accent, I team identity (vivid: the
// colour a player reads at range), X metal, B rubber, N neutral field drab, L off-white (stitching, small marks), G lens,
// K night cloth (near black, a hint of the team).
export const PAL={M:0,D:1,W:2,H:3,A:4,I:5,X:6,B:7,N:8,L:9,G:10,K:11};
const TEAM={blue:{M:0x46677f,D:0x2a3b4a,H:0x3b5670,I:0x3f9ad8,K:0x1d2227,N:0x585d4e},orange:{M:0x9c7148,D:0x5a3f2a,H:0x80583a,I:0xe86f22,K:0x29221d,N:0x655f4c}};
// [roughness, metalness, weave]: weave > .3 is cloth (relief, seams, stitching), under it a hard surface (worn edges).
const PBR=[[.93,0,1],[.93,0,1],[.86,0,.8],[.46,.06,.06],[.6,.08,.15],[.9,0,.9],[.36,.82,0],[.8,0,.12],[.95,0,1],[.7,0,.25],[.15,.45,0],[.95,0,1]];
let weave=null;
function weaveTexture(){if(weave)return weave;const n=64,data=new Uint8Array(n*n*4),g=new Float32Array(8*8),h=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);};
 for(let i=0;i<64;i++)g[i]=h(i%8,i>>3);const noise=(x,y)=>{const fx=x/8,fy=y/8,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),G=(a,b)=>g[((b&7)<<3)|(a&7)];return (G(ix,iy)*(1-sx)+G(ix+1,iy)*sx)*(1-sy)+(G(ix,iy+1)*(1-sx)+G(ix+1,iy+1)*sx)*sy;};
 // R: ripstop, a fine twill with a heavier thread every 16 texels both ways. G: a soft tileable mottle (wear and fading).
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const tw=((x+y)>>1&1)?.86:1,rip=(x%16===0||y%16===0)?.74:1,k=(y*n+x)*4;data[k]=Math.round(255*tw*rip*(.92+.08*Math.sin(x*.9)*Math.sin(y*1.3)));data[k+1]=Math.round(255*(.62*noise(x,y)+.38*noise(x*2+17,y*2+5)));data[k+2]=0;data[k+3]=255;}
 weave=new T.DataTexture(data,n,n);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.magFilter=T.LinearFilter;weave.minFilter=T.LinearMipmapLinearFilter;weave.generateMipmaps=true;weave.anisotropy=8;weave.needsUpdate=true;return weave;}
const looks=new Map();
export function wearLook(team,accent){
 const key=team+':'+accent;if(looks.has(key))return looks.get(key);const t=TEAM[team==='blue'?'blue':'orange'],c=v=>new T.Color(v);
 const cols=[c(t.M),c(t.D),c(0x2a2d2e),c(t.H),c(PAINTS[accent]?.hex||'#45535d'),c(t.I),c(0x6c7578),c(0x1b1f21),c(t.N),c(0xcfc8b6),c(0x0f1418),c(t.K)];
 const m=new T.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:0,envMapIntensity:.45});m.name='op-wear';m.userData.teamLook=true;m.userData.wear=true;
 const uniforms={wearCol:{value:cols},wearPbr:{value:PBR.map(p=>new T.Vector3(...p))},wearWeave:{value:weaveTexture()}};
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);
  s.vertexShader='attribute float wearPal;attribute vec2 wearUv;attribute float wearEdge;varying float vWearPal;varying vec2 vWearUv;varying float vWearEdge;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWearPal=wearPal;vWearUv=wearUv;vWearEdge=wearEdge;');
  s.fragmentShader=`uniform vec3 wearCol[12];uniform vec3 wearPbr[12];uniform sampler2D wearWeave;varying float vWearPal;varying vec2 vWearUv;varying float vWearEdge;
vec3 wearBump(vec3 p,vec3 n,vec2 dH,float fd){vec3 sx=normalize(dFdx(p)),sy=normalize(dFdy(p)),r1=cross(sy,n),r2=cross(n,sx);float det=dot(sx,r1)*fd;return normalize(abs(det)*n-sign(det)*(dH.x*r1+dH.y*r2));}
`+s.fragmentShader
   .replace('#include <color_fragment>',`#include <color_fragment>
int wearI=int(vWearPal+.5);vec3 wearP=wearPbr[wearI];vec4 wearS=texture2D(wearWeave,vWearUv);float wearT=wearS.r,wearM=texture2D(wearWeave,vWearUv*.047+.31).g,wearCloth=step(.3,wearP.z),wearE=clamp(vWearEdge/.016,0.,1.);
vec3 wearC=wearCol[wearI]*mix(1.,.6+.46*wearT,wearP.z)*(.9+.2*wearM);
wearC*=mix(1.,.66+.34*smoothstep(0.,1.,wearE),wearCloth);
wearC=mix(wearC,min(wearC*1.5+.035,vec3(1.)),(1.-wearCloth)*(1.-smoothstep(0.,.4,wearE))*.55);
float wearSt=wearCloth*(1.-smoothstep(.0005,.0011,abs(vWearEdge-.0058)))*step(.42,fract((vWearUv.x+vWearUv.y)*1.15));
diffuseColor.rgb=mix(wearC,wearC*1.38+.03,wearSt*.85);`)
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(wearP.x+(.5-wearT)*.12*wearP.z+(wearM-.5)*.1,0.,1.);')
   .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=wearP.y;')
   .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n{vec2 wearDH=vec2(dFdx(wearT),dFdy(wearT))*wearP.z*1.2*(1.-smoothstep(2.5,8.,length(vViewPosition)));normal=wearBump(-vViewPosition,normal,wearDH,faceDirection);}');};
 m.customProgramCacheKey=()=>'operator-wear-v43r';looks.set(key,m);return m;}
// ---- the suit under the wear: each kit's colour blocking ----------------------------------------
// Zones in bind space: sleeves (out of the torso's width), legs (below the crotch), torso; the boots stay dark leather.
// `pat`: 0 plain, 1 fine vertical rib (night cloth), 2 quilted bands (heavy undersuit), 3 ripstop squares (light field cloth).
// The suit is pushed in under the wear by its `suitTuck` weight (wearSuitGeometry).
const SUIT={
 assalto:{torso:'M',sleeve:'M',legs:'D',pat:0},
 sfondamento:{torso:'D',sleeve:'D',legs:'D',pat:2},
 tiratore:{torso:'D',sleeve:'K',legs:'K',pat:1},
 ricognizione:{torso:'M',sleeve:'M',legs:'N',pat:3},
 mastino:{torso:'K',sleeve:'K',legs:'K',pat:2}
};
const suitLooks=new Map();
export function wearSuitLook(base,team,kit){
 const key=base.uuid+':'+team+':'+kit;if(suitLooks.has(key))return suitLooks.get(key);const S=SUIT[kit];if(!S){suitLooks.set(key,base);return base;}
 const t=TEAM[team==='blue'?'blue':'orange'],col=k=>new T.Color(t[k]);
 const m=base.clone();m.name=base.name+' '+kit;m.userData.teamLook=true;m.color.set(0xffffff);m.onBeforeCompile=null;
 const uniforms={suitTorso:{value:col(S.torso)},suitSleeve:{value:col(S.sleeve)},suitLegs:{value:col(S.legs)},suitPat:{value:S.pat}};
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);
  s.vertexShader='attribute float suitTuck;varying vec3 vSuitP;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSuitP=position;transformed-=normalize(objectNormal)*suitTuck*SUIT_TUCK;');
  s.fragmentShader='uniform vec3 suitTorso;uniform vec3 suitSleeve;uniform vec3 suitLegs;uniform float suitPat;varying vec3 vSuitP;\n'+s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  {float v=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)),0.,1.),ax=abs(vSuitP.x),y=vSuitP.y;
  float sl=mix(smoothstep(290000.,320000.,ax),smoothstep(163000.,186000.,ax),smoothstep(1330000.,1390000.,y));
  float lg=(1.-smoothstep(985000.,1030000.,y))*(1.-smoothstep(330000.,360000.,ax));
  vec3 c=mix(mix(suitTorso,suitSleeve,sl),suitLegs,lg);
  #ifdef USE_MAP
  if(suitPat>.5&&suitPat<1.5)c*=.9+.1*step(.5,fract(vMapUv.x*260.));
  else if(suitPat>1.5&&suitPat<2.5)c*=.88+.12*smoothstep(.0,.25,abs(fract(y/42000.)-.5));
  else if(suitPat>2.5){vec2 g=fract(vMapUv*140.);c*=.93+.07*step(.08,min(g.x,g.y));}
  #endif
  vec3 dyed=c*(.5+.85*sqrt(v));diffuseColor.rgb=mix(vec3(.07,.066,.06)*(.6+1.1*v),dyed,smoothstep(BOOT_TOP-BOOT_FADE,BOOT_TOP+BOOT_FADE,y));}`);};
 m.defines={...base.defines,BOOT_TOP:'250000.0',BOOT_FADE:'15000.0',SUIT_TUCK:(TUCK*U).toFixed(1)};m.customProgramCacheKey=()=>'operator-wearsuit-v43r';m.needsUpdate=true;
 suitLooks.set(key,m);return m;}
// RICOGNIZIONE: the soldier head mesh is its olive neck gaiter, worn up to the nose on every kit (the eyes are another mesh);
// here it takes the scarf's team colour, its folds kept, so it reads as the scarf pulled up over the face.
const headLooks=new Map();
export function wearHeadLook(base,team,kit){
 if(kit!=='ricognizione')return base;const key=base.uuid+':'+team;if(headLooks.has(key))return headLooks.get(key);const t=TEAM[team==='blue'?'blue':'orange'];
 const m=base.clone();m.name=base.name+' scarf';m.userData.teamLook=true;const uniforms={headScarf:{value:new T.Color(t.I).lerp(new T.Color(t.D),.62)}};
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.fragmentShader='uniform vec3 headScarf;\n'+s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  {float l=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=headScarf*(.35+1.5*l);}`);};
 m.customProgramCacheKey=()=>'operator-wearhead-v43r';m.needsUpdate=true;headLooks.set(key,m);return m;}
// The suit's geometry for one wear: the suit's own attributes (shared, not copied) and the wear's tuck weights.
const tucked=new WeakMap();
export function wearSuitGeometry(wear,suitGeo){
 if(!wear?.userData.tuck)return suitGeo;let g=tucked.get(wear);if(g)return g;g=new T.BufferGeometry();for(const [n,a] of Object.entries(suitGeo.attributes))g.setAttribute(n,a);g.setIndex(suitGeo.index);for(const gr of suitGeo.groups)g.addGroup(gr.start,gr.count,gr.materialIndex);
 g.setAttribute('suitTuck',new T.BufferAttribute(wear.userData.tuck,1));g.boundingBox=suitGeo.boundingBox;g.boundingSphere=suitGeo.boundingSphere;g.name=(suitGeo.name||'suit')+' tucked';tucked.set(wear,g);return g;}
// The soldier's pads skin keeps only its gloves under the new wear (its knee and elbow pads belong to the old kit).
const gloveGeos=new WeakMap();
export function glovesOnly(skin){
 const g=skin.userData.baseGeometry||skin.geometry;if(gloveGeos.has(g))return gloveGeos.get(g);const names=skin.skeleton.bones.map(b=>boneName(b.name)),I=g.attributes.skinIndex,W=g.attributes.skinWeight,dom=i=>{let b=0,bw=-1;for(let c=0;c<4;c++){const w=W.getComponent(i,c);if(w>bw){bw=w;b=I.getComponent(i,c);}}return names[b];};
 const hand=new Uint8Array(g.attributes.position.count);for(let i=0;i<hand.length;i++)hand[i]=/Hand/.test(dom(i))?1:0;
 const src=g.index.array,keep=[];for(let k=0;k<src.length;k+=3)if(hand[src[k]]&&hand[src[k+1]]&&hand[src[k+2]])keep.push(src[k],src[k+1],src[k+2]);
 const out=new T.BufferGeometry();for(const [n,a] of Object.entries(g.attributes))out.setAttribute(n,a);out.setIndex(keep);out.boundingBox=g.boundingBox;out.boundingSphere=g.boundingSphere;
 gloveGeos.set(g,out);return out;}
// V44 op2: a part of a skin's geometry (its attributes shared): the triangles whose three vertices pass test(dominant bone, y).
// The whole bodies built without real hands or with heeled feet wear the soldier's own gloves and boots cut out of his suit.
const partGeos=new WeakMap();
export function skinPart(skin,g,key,test){let m=partGeos.get(g);if(!m)partGeos.set(g,m=new Map());if(m.has(key))return m.get(key);
 const names=skin.skeleton.bones.map(b=>boneName(b.name)),I=g.attributes.skinIndex,W=g.attributes.skinWeight,P=g.attributes.position,ok=new Uint8Array(P.count);
 for(let i=0;i<ok.length;i++){let b=0,bw=-1;for(let c=0;c<4;c++){const w=W.getComponent(i,c);if(w>bw){bw=w;b=I.getComponent(i,c);}}ok[i]=test(names[b],P.getY(i)/U)?1:0;}
 const src=g.index.array,keep=[];for(let k=0;k<src.length;k+=3)if(ok[src[k]]&&ok[src[k+1]]&&ok[src[k+2]])keep.push(src[k],src[k+1],src[k+2]);
 const out=new T.BufferGeometry();for(const [n,a] of Object.entries(g.attributes))out.setAttribute(n,a);out.setIndex(keep);out.boundingBox=g.boundingBox;out.boundingSphere=g.boundingSphere;m.set(key,out);return out;}
// ---- the body: suit and head vertices, their weights, radial maps ----------------------------------
class Body{
 constructor(suit,suitGeo,head){
  this.names=suit.skeleton.bones.map(b=>boneName(b.name));this.at={};const bindInv=suit.bindMatrix.clone().invert();
  suit.skeleton.boneInverses.forEach((m,i)=>{this.at[this.names[i]]=new T.Vector3().setFromMatrixPosition(m.clone().invert()).applyMatrix4(bindInv).divideScalar(U);});
  const pos=[],si=[],sw=[],dom=[];this.suitCount=suitGeo.attributes.position.count;
  for(const g of [suitGeo,head?.geometry]){if(!g)continue;const P=g.attributes.position,I=g.attributes.skinIndex,W=g.attributes.skinWeight;
   for(let i=0;i<P.count;i++){pos.push(P.getX(i)/U,P.getY(i)/U,P.getZ(i)/U);let b=0,bw=-1;for(let c=0;c<4;c++){const w=W.getComponent(i,c),k=I.getComponent(i,c);si.push(k);sw.push(w);if(w>bw){bw=w;b=k;}}dom.push(this.names[b]);}}
  this.pos=pos;this.si=si;this.sw=sw;this.dom=dom;this.grid=new Map();
  for(let i=0;i<dom.length;i++){const k=this.cell(pos[i*3],pos[i*3+1],pos[i*3+2]);let l=this.grid.get(k);if(!l)this.grid.set(k,l=[]);l.push(i);}
 }
 cell(x,y,z){return ((Math.floor(x/.04)+500)*1000+(Math.floor(y/.04)+500))*1000+Math.floor(z/.04)+500;}
 // Skin weights at a point: the nearest suit vertices of the allowed bones, blended by distance (four strongest bones kept).
 weights(x,y,z,allow,outI,outW){
  const cx=Math.floor(x/.04),cy=Math.floor(y/.04),cz=Math.floor(z/.04),found=[];
  for(let r=0;r<12&&(found.length<4||r<2);r++)for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)for(let k=-r;k<=r;k++){if(Math.max(Math.abs(i),Math.abs(j),Math.abs(k))!==r)continue;
   const l=this.grid.get(((cx+i+500)*1000+(cy+j+500))*1000+cz+k+500);if(!l)continue;for(const v of l){if(!allow.test(this.dom[v]))continue;const d=Math.hypot(this.pos[v*3]-x,this.pos[v*3+1]-y,this.pos[v*3+2]-z);found.push([d,v]);}}
  found.sort((a,b)=>a[0]-b[0]);const acc=new Map();for(const [d,v] of found.slice(0,4)){const f=1/(d+.004);for(let c=0;c<4;c++){const w=this.sw[v*4+c];if(w>0)acc.set(this.si[v*4+c],(acc.get(this.si[v*4+c])||0)+w*f);}}
  const top=[...acc].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((s,e)=>s+e[1],0)||1;for(let c=0;c<4;c++){outI[c]=top[c]?.[0]??0;outW[c]=top[c]?top[c][1]/sum:0;}
 }
 // A radial map of the suit around the segment a→b: the outermost suit radius per angle (0: the front, +90°: towards +x)
 // and per position s (0 at a, 1 at b), filled and smoothed. point(ang,s,off) lies `off` metres out of the suit.
 cyl(a,b,allow,{na=64,ns=40,s0=-.1,s1=1.1,passes=10,tol=.013}={}){
  const u=b.clone().sub(a),L=u.length();u.normalize();const f=new T.Vector3(0,0,1).addScaledVector(u,-u.z).normalize(),sd=new T.Vector3(1,0,0).addScaledVector(u,-u.x).addScaledVector(f,-f.x).normalize();
  const bins=new Float32Array(na*ns).fill(-1),d=new T.Vector3();
  for(let i=0;i<this.dom.length;i++){if(!allow.test(this.dom[i]))continue;d.set(this.pos[i*3]-a.x,this.pos[i*3+1]-a.y,this.pos[i*3+2]-a.z);const t=d.dot(u)/L;if(t<s0||t>s1)continue;d.addScaledVector(u,-t*L);
   const r=d.length(),ang=Math.atan2(d.dot(sd),d.dot(f)),ka=((Math.floor((ang+Math.PI)/(2*Math.PI)*na)%na)+na)%na,ks=Math.min(ns-1,Math.floor((t-s0)/(s1-s0)*ns));bins[ks*na+ka]=Math.max(bins[ks*na+ka],r);}
  fill(bins,na,ns,passes,tol);const map={a,u,L,f,sd,na,ns,s0,s1,bins,body:this};map.r=(ang,s)=>{const fa=((ang+Math.PI)/(2*Math.PI)*na-.5+na*4)%na,fs=clamp((s-s0)/(s1-s0)*ns-.5,0,ns-1),ia=Math.floor(fa),is=Math.min(ns-2,Math.floor(fs)),ta=fa-ia,ts=fs-is,B=(j,k)=>bins[j*na+(k%na)];
   return (B(is,ia)*(1-ta)+B(is,ia+1)*ta)*(1-ts)+(B(is+1,ia)*(1-ta)+B(is+1,ia+1)*ta)*ts;};
  map.dir=(ang,out=new T.Vector3())=>out.copy(f).multiplyScalar(Math.cos(ang)).addScaledVector(sd,Math.sin(ang));
  map.point=(ang,s,off=0,out=new T.Vector3())=>{const r=map.r(ang,s)+off;return map.dir(ang,out).multiplyScalar(r).add(a).addScaledVector(u,s*L);};
  return map;}
 // A radial map around a centre, by azimuth (0: the front, +90°: +x) and elevation (-90°..90°): heads and hoods.
 sphere(c,allow,{na=64,ne=40}={}){
  const bins=new Float32Array(na*ne).fill(-1),d=new T.Vector3();
  for(let i=0;i<this.dom.length;i++){if(!allow.test(this.dom[i]))continue;d.set(this.pos[i*3]-c.x,this.pos[i*3+1]-c.y,this.pos[i*3+2]-c.z);const r=d.length(),az=Math.atan2(d.x,d.z),el=Math.asin(clamp(d.y/r,-1,1)),ka=((Math.floor((az+Math.PI)/(2*Math.PI)*na)%na)+na)%na,ke=Math.min(ne-1,Math.floor((el+Math.PI/2)/Math.PI*ne));bins[ke*na+ka]=Math.max(bins[ke*na+ka],r);}
  fill(bins,na,ne,4,.002);const map={c,bins,na,ne,body:this,sphere:true};
  map.r=(az,el)=>{const fa=((az+Math.PI)/(2*Math.PI)*na-.5+na*4)%na,fe=clamp((el+Math.PI/2)/Math.PI*ne-.5,0,ne-1),ia=Math.floor(fa),ie=Math.min(ne-2,Math.floor(fe)),ta=fa-ia,te=fe-ie,B=(j,k)=>bins[j*na+(k%na)];return (B(ie,ia)*(1-ta)+B(ie,ia+1)*ta)*(1-te)+(B(ie+1,ia)*(1-ta)+B(ie+1,ia+1)*ta)*te;};
  map.dir=(az,el,out=new T.Vector3())=>out.set(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
  map.point=(az,el,off=0,out=new T.Vector3())=>map.dir(az,el,out).multiplyScalar(map.r(az,el)+off).add(c);
  return map;}
 // Tuck weights of the suit's vertices: 1 under a wear piece of the vertex's own bones, easing to 0 past its rim (by the
 // piece's `reach`: 45 mm, a collar 80 mm so the jacket's own collar folds in under it).
 tuck(pieces){
  const C=.04,cell=(x,y,z)=>((Math.floor(x/C)+800)*1600+(Math.floor(y/C)+800))*1600+Math.floor(z/C)+800,grid=new Map();
  pieces.forEach(({g},pi)=>{const P=g.attributes.position;for(let i=0;i<P.count;i+=2){const k=cell(P.getX(i),P.getY(i),P.getZ(i));let l=grid.get(k);if(!l)grid.set(k,l=[]);l.push(pi,P.getX(i),P.getY(i),P.getZ(i));}});
  const ok=pieces.map(()=>new Map()),out=new Float32Array(this.suitCount);
  for(let v=0;v<this.suitCount;v++){const x=this.pos[v*3],y=this.pos[v*3+1],z=this.pos[v*3+2],cx=Math.floor(x/C),cy=Math.floor(y/C),cz=Math.floor(z/C),bone=this.dom[v];let w=0;
   for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)for(let k=-2;k<=2;k++){const l=grid.get(((cx+i+800)*1600+(cy+j+800))*1600+cz+k+800);if(!l)continue;
    for(let q=0;q<l.length;q+=4){const pc=pieces[l[q]],reach=pc.reach||.045,d=Math.hypot(l[q+1]-x,l[q+2]-y,l[q+3]-z);if(d>=reach)continue;const f=1-sstep(reach*.5,reach,d);if(f<=w)continue;const m=ok[l[q]];let a=m.get(bone);if(a===undefined)m.set(bone,a=pc.allow.test(bone));if(a)w=f;}}
   out[v]=w;}
  return out;}
}
// Empty bins take their row's neighbours (round the angle), empty rows the nearest filled row; then an envelope smoothing:
// each pass blurs, and no bin sinks more than `tol` under the suit it maps (the tuck hides that much).
function fill(b,na,ns,passes=3,tol=.004){
 for(let j=0;j<ns;j++){const row=j*na,has=[];for(let k=0;k<na;k++)if(b[row+k]>=0)has.push(k);if(!has.length)continue;
  for(let k=0;k<na;k++){if(b[row+k]>=0)continue;let lo=null,hi=null;for(let s=1;s<na;s++){if(lo===null&&b[row+(k-s+na)%na]>=0)lo=s;if(hi===null&&b[row+(k+s)%na]>=0)hi=s;if(lo!==null&&hi!==null)break;}b[row+k]=(b[row+(k-lo+na)%na]*hi+b[row+(k+hi)%na]*lo)/(lo+hi);}}
 for(let j=0;j<ns;j++){if(b[j*na]>=0)continue;let n=null;for(let s=1;s<ns&&n===null;s++){if(j-s>=0&&b[(j-s)*na]>=0)n=j-s;else if(j+s<ns&&b[(j+s)*na]>=0)n=j+s;}if(n!==null)for(let k=0;k<na;k++)b[j*na+k]=b[n*na+k];}
 const raw=b.slice(),t=new Float32Array(b.length);for(let p=0;p<passes;p++){for(let j=0;j<ns;j++)for(let k=0;k<na;k++){const at=(jj,kk)=>b[clamp(jj,0,ns-1)*na+((kk+na)%na)];t[j*na+k]=Math.max(raw[j*na+k]-tol,(at(j,k)*4+at(j,k-1)+at(j,k+1)+at(j-1,k)+at(j+1,k))/8);}b.set(t);}
}
// ---- pieces ------------------------------------------------------------------------------------
// A piece is a geometry in metres (position, normal, wearUv, wearEdge: metres to its nearest rim), one palette slot and the
// bones whose suit it takes weights from.
class Wear{
 constructor(body){this.body=body;this.pieces=[];}
 push(g,pal,allow,reach){if(!g.index)g.setIndex([...Array(g.attributes.position.count).keys()]);if(!g.attributes.normal)g.computeVertexNormals();const P=g.attributes.position;if(!g.attributes.wearUv){const uv=new Float32Array(P.count*2);for(let i=0;i<P.count;i++){uv[i*2]=(P.getX(i)+P.getZ(i))*55;uv[i*2+1]=P.getY(i)*55;}g.setAttribute('wearUv',new T.BufferAttribute(uv,2));}
  if(!g.attributes.wearEdge)g.setAttribute('wearEdge',new T.BufferAttribute(new Float32Array(P.count).fill(.03),1));
  for(const k of Object.keys(g.attributes))if(!['position','normal','wearUv','wearEdge'].includes(k))g.deleteAttribute(k);this.pieces.push({g,pal,allow,reach});return g;}
 // A padded panel on a map: rows from s0 to s1, each spanning the angles aL(s)..aR(s) (degrees, or functions of s), `th`
 // thick with its edges eased down to `edge` over `bevel` metres; `bulge` pillows the middle; closed: a ring with no ends.
 panel(map,o,pal,allow){
  const {s0,s1,off=.004,th=.012,bevel=.01,bulge=0,closed=false}=o,ns=Math.max(1,Math.round((o.ns??10)*1.15)),na=Math.max(2,Math.round((o.na??16)*1.15)),edge=o.edge??th*.4,aL=typeof o.aL==='function'?o.aL:()=>o.aL,aR=typeof o.aR==='function'?o.aR:()=>o.aR,sag=o.sag||(()=>0);
  const pos=[],uv=[],ed=[],idx=[],out=new T.Vector3(),inn=new T.Vector3(),SR=s=>map.sphere?s*R:s,len=map.sphere?Math.abs(s1-s0)*R*.1:Math.abs(s1-s0)*map.L;
  const at=(j,k,top)=>{const v=j/ns,u=k/na,s=s0+(s1-s0)*v,a0=aL(s)*R,a1=aR(s)*R,ang=a0+(a1-a0)*u,r=map.r(ang,SR(s)),w=Math.abs(a1-a0)*r,e=Math.min(closed?1e9:Math.min(u,1-u)*w,Math.min(v,1-v)*len),h=edge+(th-edge)*Math.sqrt(sstep(0,bevel,e))+bulge*Math.sin(Math.PI*u)*Math.sin(Math.PI*v),dz=sag(u,v);
   map.point(ang,SR(s),off+dz+(top?h:0),top?out:inn);return [top?out:inn,ang*r,map.sphere?SR(s)*.1:s*map.L,top?e:0];};
  const add=(p,a,b,e)=>{pos.push(p.x,p.y,p.z);uv.push(a*55,b*55);ed.push(e);return pos.length/3-1;};
  const grid=top=>{const ids=[];for(let j=0;j<=ns;j++)for(let k=0;k<=na;k++){const [p,a,b,e]=at(j,k,top);ids.push(add(p,a,b,e));}return ids;};
  const O=grid(true),I=grid(false),W=na+1,radial=new T.Vector3(),mid=(j,k,ids)=>new T.Vector3(pos[ids[j*W+k]*3],pos[ids[j*W+k]*3+1],pos[ids[j*W+k]*3+2]);
  const centre=new T.Vector3();for(const i of O)centre.add(new T.Vector3(pos[i*3],pos[i*3+1],pos[i*3+2]));centre.divideScalar(O.length);
  const tri=(a,b,c,want)=>{const A=new T.Vector3(pos[a*3],pos[a*3+1],pos[a*3+2]),B=new T.Vector3(pos[b*3],pos[b*3+1],pos[b*3+2]),C=new T.Vector3(pos[c*3],pos[c*3+1],pos[c*3+2]),n=B.clone().sub(A).cross(C.clone().sub(A));if(n.dot(want)<0)idx.push(a,c,b);else idx.push(a,b,c);};
  for(let j=0;j<ns;j++)for(let k=0;k<na;k++){const v=(j+.5)/ns,u=(k+.5)/na,s=s0+(s1-s0)*v,ang=(aL(s)+(aR(s)-aL(s))*u)*R;
   if(map.sphere)map.dir(ang,SR(s),radial);else map.dir(ang,radial);
   const q=[j*W+k,j*W+k+1,(j+1)*W+k,(j+1)*W+k+1];tri(O[q[0]],O[q[1]],O[q[2]],radial);tri(O[q[1]],O[q[3]],O[q[2]],radial);const neg=radial.clone().negate();tri(I[q[0]],I[q[1]],I[q[2]],neg);tri(I[q[1]],I[q[3]],I[q[2]],neg);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('wearUv',new T.Float32BufferAttribute(uv,2));g.setAttribute('wearEdge',new T.Float32BufferAttribute(ed,1));g.setIndex(idx);g.computeVertexNormals();
  // Walls on their own vertices, so the rims stay crisp.
  const loops=[];for(let k=0;k<=na;k++)loops.push([0,k]);const bottom=loops.splice(0),top=[];for(let k=0;k<=na;k++)top.push([ns,k]);const left=[],right=[];for(let j=0;j<=ns;j++){left.push([j,0]);right.push([j,na]);}
  const walls=[bottom,top,...(closed?[]:[left,right])],wp=[],wu=[],wi=[];
  for(const loop of walls){for(let i=0;i<loop.length-1;i++){const [j0,k0]=loop[i],[j1,k1]=loop[i+1],o0=mid(j0,k0,O),o1=mid(j1,k1,O),i0=mid(j0,k0,I),i1=mid(j1,k1,I),c=o0.clone().add(o1).add(i0).add(i1).multiplyScalar(.25),want=c.clone().sub(centre);
    const n=wp.length/3;for(const p of [o0,o1,i0,i1]){wp.push(p.x,p.y,p.z);}wu.push(0,0,1,0,0,.4,1,.4);const A=o0,B=o1,C=i0,nn=B.clone().sub(A).cross(C.clone().sub(A));if(nn.dot(want)<0)wi.push(n,n+2,n+1,n+1,n+2,n+3);else wi.push(n,n+1,n+2,n+1,n+3,n+2);}}
  const w=new T.BufferGeometry();w.setAttribute('position',new T.Float32BufferAttribute(wp,3));w.setAttribute('wearUv',new T.Float32BufferAttribute(wu,2));w.setAttribute('wearEdge',new T.BufferAttribute(new Float32Array(wp.length/3),1));w.setIndex(wi);w.computeVertexNormals();
  this.push(g,pal,allow,o.reach);if(wi.length)this.push(w,pal,allow,o.reach);return g;}
 // A geometry (centred, its back at z=-depth/2) placed on a map at (ang,s): +z along the surface normal, +y up the body.
 place(g,map,ang,s,off,pal,allow,{depth=0,rot=0,lean=0,yaw=0,flip=false}={}){
  const p=map.sphere?map.point(ang*R,s*R,off):map.point(ang*R,s,off),e=.002,dA=map.sphere?map.point(ang*R+e,s*R,off):map.point(ang*R+e,s,off),dS=map.sphere?map.point(ang*R,s*R+e,off):map.point(ang*R,s+e*.2,off);
  const n=dA.clone().sub(p).cross(dS.clone().sub(p)).normalize(),radial=map.sphere?map.dir(ang*R,s*R):map.dir(ang*R);if(n.dot(radial)<0)n.negate();
  const up=new T.Vector3(0,1,0).addScaledVector(n,-n.y);if(up.lengthSq()<1e-6)up.set(0,0,-1);up.normalize();const right=up.clone().cross(n);
  const m=new T.Matrix4().makeBasis(right,up,n).multiply(new T.Matrix4().makeRotationZ(rot*R)).multiply(new T.Matrix4().makeRotationX(lean*R)).multiply(new T.Matrix4().makeRotationY(yaw*R));if(flip)m.multiply(new T.Matrix4().makeScale(-1,1,1));
  m.setPosition(p.addScaledVector(n,depth/2));g.applyMatrix4(m);if(flip){const I=g.index.array;for(let i=0;i<I.length;i+=3){const t=I[i+1];I[i+1]=I[i+2];I[i+2]=t;}g.computeVertexNormals();}return this.push(g,pal,allow);}
 // A patch: a thin backing in `back` with the game's mark raised on it in `pal`, lying flush on the map.
 patch(map,ang,s,off,shape,size,pal,back,allow,rot=0){this.place(emblem(SHAPES.tile(),size*1.32,.003),map,ang,s,off,back,allow,{depth:.0046,rot});this.place(emblem(SHAPES[shape](),size),map,ang,s,off+.0042,pal,allow,{depth:.0041,rot});}
 // A flat strap laid along a path of (degrees, s[, off]) points on a map, `w` wide and `th` thick.
 strap(map,pts,w,th,off,pal,allow,steps=24){
  const curve=new T.CatmullRomCurve3(pts.map(([a,s,o])=>new T.Vector3(a,s,o??off)),false,'centripetal'),P=[],N=[],pos=[],idx=[],uv=[];
  for(let i=0;i<=steps;i++){const q=curve.getPoint(i/steps),p=map.sphere?map.point(q.x*R,q.y*R,q.z):map.point(q.x*R,q.y,q.z),rad=map.sphere?map.dir(q.x*R,q.y*R):map.dir(q.x*R);P.push(p);N.push(rad);}
  for(let i=0;i<=steps;i++){const t=P[Math.min(steps,i+1)].clone().sub(P[Math.max(0,i-1)]).normalize(),n=N[i].clone().addScaledVector(t,-N[i].dot(t)).normalize(),b=n.clone().cross(t).multiplyScalar(w/2),p=P[i];
   for(const v of [p.clone().add(b),p.clone().sub(b),p.clone().add(b).addScaledVector(n,th),p.clone().sub(b).addScaledVector(n,th)])pos.push(v.x,v.y,v.z);const l=i/steps*3;uv.push(0,l*20,w*55,l*20,0,l*20,w*55,l*20);}
  for(let i=0;i<steps;i++){const a=i*4,b=a+4;idx.push(a+2,b+2,a+3,a+3,b+2,b+3, a,b,a+2,a+2,b,b+2, a+1,a+3,b+1,b+1,a+3,b+3);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('wearUv',new T.Float32BufferAttribute(uv,2));g.setAttribute('wearEdge',new T.BufferAttribute(new Float32Array(pos.length/3).fill(.012),1));g.setIndex(idx);g.computeVertexNormals();
  // Orient the top towards the outside of the map.
  const n0=new T.Vector3(pos[6]-pos[0],pos[7]-pos[1],pos[8]-pos[2]);const A=new T.Vector3(pos[6],pos[7],pos[8]),B=new T.Vector3(pos[18],pos[19],pos[20]),C=new T.Vector3(pos[9],pos[10],pos[11]);if(B.sub(A).cross(C.sub(A)).dot(n0)<0){const I=g.index.array;for(let i=0;i<I.length;i+=3){const t=I[i+1];I[i+1]=I[i+2];I[i+2]=t;}g.computeVertexNormals();}
  return this.push(g,pal,allow);}
 build(){
  const out=[];const I=[0,0,0,0],Wt=[0,0,0,0];const tuck=this.body.tuck(this.pieces);
  for(const {g,pal,allow} of this.pieces){const P=g.attributes.position,n=P.count,si=new Uint16Array(n*4),sw=new Float32Array(n*4),pa=new Float32Array(n).fill(pal);
   for(let i=0;i<n;i++){this.body.weights(P.getX(i),P.getY(i),P.getZ(i),allow,I,Wt);si.set(I,i*4);sw.set(Wt,i*4);}
   g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.setAttribute('wearPal',new T.Float32BufferAttribute(pa,1));out.push(g);}
  const merged=mergeGeometries(out,false);for(const g of out)g.dispose();merged.scale(U,U,U);merged.computeBoundingBox();merged.computeBoundingSphere();merged.userData.tuck=tuck;return merged;}
}
// Rounded box (w,h,d metres, corner radius r); its rim distance runs across the face (w,h).
function rbox(w,h,d,r=.006,seg=3){let g=new T.BoxGeometry(w,h,d,seg,seg,seg);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);const P=g.attributes.position,hx=w/2-r,hy=h/2-r,hz=d/2-r,v=new T.Vector3(),c=new T.Vector3(),e=new Float32Array(P.count);
 for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i);c.set(clamp(v.x,-hx,hx),clamp(v.y,-hy,hy),clamp(v.z,-hz,hz));const q=v.clone().sub(c);if(q.lengthSq()>1e-12)v.copy(c).addScaledVector(q.normalize(),r);P.setXYZ(i,v.x,v.y,v.z);e[i]=v.z>hz*.5?Math.min(w/2-Math.abs(v.x),h/2-Math.abs(v.y)):0;}g.setAttribute('wearEdge',new T.BufferAttribute(e,1));g.computeVertexNormals();return g;}
function cylinder(r,h,seg=12,r2=r){const g=new T.CylinderGeometry(r2,r,h,seg,1);g.deleteAttribute('uv');return g;}
function emblem(shapes,size,depth=.0025){const g=new T.ExtrudeGeometry(shapes,{depth,bevelEnabled:true,bevelThickness:.0008,bevelSize:.0006,bevelSegments:1,curveSegments:8});g.deleteAttribute('uv');g.scale(size,size,1);g.computeBoundingBox();const c=g.boundingBox.getCenter(new T.Vector3());g.translate(-c.x,-c.y,-c.z);g.computeVertexNormals();return g;}
// A thin slab over a (u,v) patch: p(u,v) its top surface, `th` thick downward along `down`; rim distance from u, v ends.
function slab(p,nu,nv,th,down,lenU,lenV){const pos=[],ed=[],idx=[],q=new T.Vector3();
 for(const s of [0,1])for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){p(i/nu,j/nv,q);if(s)q.addScaledVector(down,th);pos.push(q.x,q.y,q.z);ed.push(s?0:Math.min(Math.min(i/nu,1-i/nu)*lenU,(1-j/nv)*lenV));}
 const W=nu+1,H=(nv+1)*W,f=(a,b,c,flip)=>flip?idx.push(a,c,b):idx.push(a,b,c);
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*W+i,b=a+1,c=a+W,d=c+1;f(a,b,c,0);f(b,d,c,0);f(a+H,b+H,c+H,1);f(b+H,d+H,c+H,1);}
 for(let i=0;i<nu;i++){const a=nv*W+i,b=a+1;f(a,b,a+H,1);f(b,b+H,a+H,1);}for(let j=0;j<nv;j++)for(const i of [0,nu]){const a=j*W+i,c=a+W;f(a,c,a+H,i?1:0);f(c,c+H,a+H,i?1:0);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('wearEdge',new T.Float32BufferAttribute(ed,1));g.setIndex(idx);g.computeVertexNormals();
 // Face the top up (the slab's own winding is decided by its parametrisation).
 const A=new T.Vector3().fromArray(pos,0),B=new T.Vector3().fromArray(pos,3),C=new T.Vector3().fromArray(pos,W*3);if(B.sub(A).cross(C.sub(A)).dot(down)>0){const I=g.index.array;for(let i=0;i<I.length;i+=3){const t=I[i+1];I[i+1]=I[i+2];I[i+2]=t;}g.computeVertexNormals();}return g;}
// The game's own marks (unit size, drawn in a 1×1 box), worn as small patches in the team's colour: abstract shapes of the
// game's world, no real unit, army, rank, flag, brand or another game's sign.
const SHAPES={
 // The patch every mark is worn on: a rounded square.
 tile(){const p=new T.Shape(),h=.5,r=.16;p.moveTo(-h+r,-h);p.lineTo(h-r,-h);p.quadraticCurveTo(h,-h,h,-h+r);p.lineTo(h,h-r);p.quadraticCurveTo(h,h,h-r,h);p.lineTo(-h+r,h);p.quadraticCurveTo(-h,h,-h,h-r);p.lineTo(-h,-h+r);p.quadraticCurveTo(-h,-h,-h+r,-h);return [p];},
 // ASSALTO, "Varco" (the way in): a block split on the diagonal, its upper half pushed through ahead of the lower.
 varco(){const a=new T.Shape(),b=new T.Shape(),g=.07;a.moveTo(-.46,-.46);a.lineTo(.46-g,-.46);a.lineTo(-.46,.46-g);a.closePath();b.moveTo(.46+.1,-.46+g+.1);b.lineTo(.46+.1,.46+.1);b.lineTo(-.46+g+.1,.46+.1);b.closePath();return [a,b];},
 // SFONDAMENTO, "Muro": three stones laid in a bond, two below and one across their joint.
 muro(){const s=[],st=(x,y,w,h)=>{const p=new T.Shape(),r=.05;p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);p.lineTo(x+w,y+h-r);p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);p.lineTo(x+r,y+h);p.quadraticCurveTo(x,y+h,x,y+h-r);p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);s.push(p);};st(-.5,-.42,.47,.36);st(.03,-.42,.47,.36);st(-.24,.04,.48,.36);return s;},
 // TIRATORE, "Ago" (the needle): a long thin spindle with an eye at one end, lying on the diagonal.
 ago(){const p=new T.Shape();p.moveTo(-.5,0);p.quadraticCurveTo(0,.075,.5,0);p.quadraticCurveTo(0,-.075,-.5,0);const h=new T.Path();h.absellipse(.3,0,.09,.026,0,Math.PI*2,true);p.holes.push(h);const m=new T.Matrix3().makeRotation(Math.PI/4),tr=v=>v.applyMatrix3(m);const q=new T.Shape(p.getPoints(24).map(tr));q.holes.push(new T.Path(h.getPoints(16).map(tr)));return [q];},
 // RICOGNIZIONE, "Orecchio" (the listening ear, the game's own name): a spiral band winding one and a quarter turns in.
 orecchio(){const o=[],i=[],N=40;for(let k=0;k<=N;k++){const t=k/N,a=Math.PI*.5+t*Math.PI*2.4,r=.5-.3*t;o.push(new T.Vector2(Math.cos(a)*r,Math.sin(a)*r));i.push(new T.Vector2(Math.cos(a)*(r-.13+.05*t),Math.sin(a)*(r-.13+.05*t)));}return [new T.Shape([...o,...i.reverse()])];}
};
// ---- the kits ------------------------------------------------------------------------------
const TORSO=/^(Hips|Spine|Spine1|Spine2|Neck|LeftShoulder|RightShoulder)$/,CHEST=/^(Spine1|Spine2|LeftShoulder|RightShoulder|Neck)$/,WAIST=/^(Hips|Spine)$/,HEAD=/^(Head|Neck)$/,COLLAR=/^(Spine2|Neck|LeftShoulder|RightShoulder)$/;
const side=n=>({Left:1,Right:-1})[n];
function maps(b){const a=b.at,m={};
 m.torso=b.cyl(new T.Vector3(0,.84,-.012),new T.Vector3(0,1.64,-.012),TORSO,{na:72,ns:48,s0:0,s1:1});m.y=y=>(y-.84)/.8;
 const L={passes:3,tol:.006};for(const S of ['Left','Right']){m[S+'arm']=b.cyl(a[S+'Arm'],a[S+'ForeArm'],new RegExp('^'+S+'Arm$'),L);m[S+'fore']=b.cyl(a[S+'ForeArm'],a[S+'Hand'],new RegExp('^'+S+'ForeArm$'),{...L,s0:-.05,s1:1.02});
  m[S+'thigh']=b.cyl(a[S+'UpLeg'],a[S+'Leg'],new RegExp('^'+S+'UpLeg$'),L);m[S+'shin']=b.cyl(a[S+'Leg'],a[S+'Foot'],new RegExp('^'+S+'(Leg|Foot)$'),{...L,s0:-.15,s1:1.05});}
 // V44 op4: shell maps, smoothed as a hard envelope (the trousers' folds no longer ripple a greave or a thigh plate).
 const SM={passes:22,tol:.016};for(const S of ['Left','Right']){m[S+'armS']=b.cyl(a[S+'Arm'],a[S+'ForeArm'],new RegExp('^'+S+'Arm$'),SM);m[S+'foreS']=b.cyl(a[S+'ForeArm'],a[S+'Hand'],new RegExp('^'+S+'ForeArm$'),{...SM,s0:-.05,s1:1.02});
  m[S+'thighS']=b.cyl(a[S+'UpLeg'],a[S+'Leg'],new RegExp('^'+S+'UpLeg$'),SM);m[S+'shinS']=b.cyl(a[S+'Leg'],a[S+'Foot'],new RegExp('^'+S+'(Leg|Foot)$'),{...SM,s0:-.15,s1:1.05});}
 m.neck=b.cyl(new T.Vector3(0,1.5,-.03),new T.Vector3(0,1.6,-.025),/^(Neck|Head)$/,{s0:0,s1:1,na:48,ns:12,passes:6,tol:.006});m.ny=y=>(y-1.5)/.1;
 m.head=b.sphere(new T.Vector3(0,a.Head.y+.085,a.Head.z+.0),HEAD);return m;}
// V44 op2: webbing rows (MOLLE-like loops, generic) laid across a plate: `rows` thin straps from y0 up, 25 mm apart.
const webbing=(w,t,y,y0,rows,aL,aR,off,allow,pal=PAL.W)=>{for(let i=0;i<rows;i++)w.panel(t,{s0:y(y0+i*.025),s1:y(y0+i*.025+.011),aL,aR,off,th:.0035,edge:.001,ns:1,na:Math.max(6,Math.round(Math.abs(aR-aL)/5)),bevel:.0015},pal,allow);};
// Two shoulder straps of a carrier, front plate top to back plate top over each shoulder.
const shoulderStraps=(w,t,y,top,off,allow)=>{for(const s of [1,-1])w.strap(t,[[s*28,y(top),off],[s*36,y(top+.07),off*.7],[s*44,y(top+.13),.01],[s*90,y(top+.17),.008],[s*136,y(top+.13),.01],[s*146,y(top+.07),off*.7],[s*152,y(top),off]],.05,.006,off,PAL.W,allow,28);};
const ring=(w,map,s0,s1,off,th,pal,allow,o={})=>w.panel(map,{s0,s1,aL:-180,aR:180,closed:true,off,th,ns:o.ns??2,na:o.na??24,bevel:o.bevel??th*.5,bulge:o.bulge??0,sag:o.sag},pal,allow);
const KIT_WEAR={
 // ASSALTO, first in. The silhouette is a wedge leaning into the doorway: everything hard sits on the lead (left) side. A
 // plate carrier cut on the diagonal (high over the left lung, low on the right), a bandolier of magazines running from the
 // right hip over the left shoulder, a curved guard on the lead shoulder and forearm, the right arm free and light with the
 // team's band. Belt with a sidearm platform on the right thigh, angular knee shells.
 assalto(w,m,o){const {M,D,W,H,A,I,X,B,L}=PAL,y=m.y,t=m.torso;
  w.panel(t,{s0:y(1.13),s1:y(1.5),aL:s=>-50+66*sstep(y(1.3),y(1.5),s),aR:s=>50-14*sstep(y(1.44),y(1.5),s),off:.012,th:.017,ns:14,na:18,bevel:.012},W,TORSO);
  w.panel(t,{s0:y(1.13),s1:y(1.44),aL:136,aR:224,off:.012,th:.016,ns:10,na:14,bevel:.012},W,TORSO);
  for(const s of [1,-1])w.panel(t,{s0:y(1.13),s1:y(1.26),aL:s>0?44:-136,aR:s>0?136:-44,off:.009,th:.009,ns:5,na:12,bevel:.006},W,TORSO);
  // The bandolier: right hip, across the plate, over the left shoulder, down the back to the right hip.
  w.strap(t,[[-62,y(1.03),.014],[-34,y(1.14),.034],[-6,y(1.26),.034],[22,y(1.39),.034],[44,y(1.52),.018],[78,y(1.62),.012],[130,y(1.58),.012],[168,y(1.42),.034],[204,y(1.22),.03],[236,y(1.05),.012]],.046,.006,.03,W,TORSO,40);
  [[-34,1.13],[-14,1.215],[6,1.3],[26,1.385]].forEach(([a,yy],i)=>{const r=18;w.place(rbox(.05,.072,.032,.008),t,a,y(yy),.04,D,TORSO,{depth:.032,rot:r});w.place(rbox(.054,.022,.036,.006).translate(0,.032,.002),t,a,y(yy),.04,i===3?A:W,TORSO,{depth:.032,rot:r});});
  // A close mock-neck of the undersuit, the jacket's collar folded in under it.
  w.panel(m.neck,{s0:m.ny(1.5),s1:m.ny(1.565),aL:-180,aR:180,closed:true,off:.008,th:.009,edge:.004,ns:3,na:30,bevel:.008,reach:.08},D,COLLAR);
  // Back: a slim hydration panel and a drag handle; belt with its buckle and the accent keeper.
  w.place(rbox(.16,.18,.026,.012),t,180,y(1.27),.028,M,TORSO,{depth:.026});w.place(rbox(.09,.016,.02,.006),t,180,y(1.41),.03,W,TORSO,{depth:.02});
  w.panel(t,{s0:y(1.0),s1:y(1.045),aL:-180,aR:180,closed:true,off:.006,th:.01,ns:3,na:64,bevel:.004},W,WAIST);w.place(rbox(.05,.034,.012,.004),t,0,y(1.022),.014,X,WAIST,{depth:.012});w.place(rbox(.014,.04,.008,.002),t,-28,y(1.022),.016,A,WAIST,{depth:.008});
  // Lead side: a curved guard over the left shoulder with the mark, a guard on the left forearm; the right arm's team band.
  const la=m.LeftarmS;w.panel(la,{s0:.02,s1:.42,aL:s=>-10+20*sstep(.28,.42,s),aR:s=>180-20*sstep(.28,.42,s),off:.004,th:.012,edge:.002,ns:11,na:16,bevel:.018},H,/^LeftArm$/);w.panel(la,{s0:.4,s1:.42,aL:12,aR:168,off:.015,th:.003,edge:.001,ns:1,na:14,bevel:.0015},I,/^LeftArm$/);
  w.panel(la,{s0:.36,s1:.39,aL:0,aR:160,off:.012,th:.003,edge:.001,ns:1,na:12,bevel:.0015},W,/^LeftArm$/);w.patch(la,78,.16,.016,'varco',.042,L,W,/^LeftArm$/);
  w.panel(m.LeftforeS,{s0:.14,s1:.58,aL:-50,aR:200,off:.004,th:.011,edge:.002,ns:8,na:14,bevel:.016},H,/^LeftForeArm$/);w.panel(m.LeftforeS,{s0:.14,s1:.16,aL:-46,aR:196,off:.014,th:.003,edge:.001,ns:1,na:16,bevel:.0015},I,/^LeftForeArm$/);
  webbing(w,t,y,1.16,4,-44,40,.031,TORSO);webbing(w,t,y,1.16,6,140,220,.03,TORSO);shoulderStraps(w,t,y,1.44,.03,TORSO);
  ring(w,m.Rightarm,.38,.44,.003,.005,I,/^RightArm$/,{na:28});
  // Sidearm platform on the right thigh, two straps round it; knee shells with a ridge; ankle collars.
  const rt=m.Rightthigh;w.panel(rt,{s0:.3,s1:.62,aL:-150,aR:-50,off:.01,th:.012,ns:8,na:10,bevel:.01},D,/^RightUpLeg$/);w.place(rbox(.06,.09,.03,.008),rt,-100,.46,.024,W,/^RightUpLeg$/,{depth:.03});
  for(const s of [.36,.56])ring(w,rt,s,s+.05,.004,.005,W,/^RightUpLeg$/,{ns:1});
  // V44 op4: the carrier's bound edges, a radio pouch and a utility pouch on the cummerbund, an admin flap low on the lead side.
  w.panel(t,{s0:y(1.13),s1:y(1.142),aL:-50,aR:50,off:.027,th:.003,ns:1,na:18,bevel:.0015},D,TORSO);w.panel(t,{s0:y(1.13),s1:y(1.142),aL:136,aR:224,off:.026,th:.003,ns:1,na:14,bevel:.0015},D,TORSO);
  w.place(rbox(.056,.11,.036,.01),t,92,y(1.21),.016,D,TORSO,{depth:.036});w.place(rbox(.06,.026,.04,.006).translate(0,.05,.002),t,92,y(1.21),.016,W,TORSO,{depth:.036});w.place(cylinder(.0035,.07,8).translate(.018,.085,0),t,92,y(1.21),.016,B,TORSO,{depth:.008});
  w.place(rbox(.07,.075,.034,.01),t,-92,y(1.19),.016,D,TORSO,{depth:.034});w.place(rbox(.074,.022,.038,.006).translate(0,.034,.002),t,-92,y(1.19),.016,W,TORSO,{depth:.034});
  w.place(rbox(.09,.05,.014,.006),t,30,y(1.185),.03,D,TORSO,{depth:.014});w.place(rbox(.016,.03,.004,.002),t,30,y(1.185),.045,A,TORSO,{depth:.004});
  for(const S of ['Left','Right']){const sh=m[S+'shinS'],leg=new RegExp('^'+S+'Leg$');w.panel(sh,{s0:-.1,s1:.16,aL:s=>-52+10*sstep(.08,.16,s),aR:s=>52-10*sstep(.08,.16,s),off:.01,th:.016,ns:8,na:12,bevel:.01},H,leg);w.panel(sh,{s0:-.08,s1:.15,aL:-7,aR:7,off:.025,th:.006,ns:6,na:2,bevel:.003},B,leg);
   ring(w,sh,.86,.92,.006,.008,B,new RegExp('^'+S+'(Leg|Foot)$'));}
 },
 // SFONDAMENTO, the wall: the mass sits in front, not out to the sides. A deep shell over chest and belly, a raised collar,
 // three belly lames, the team's band across the chest, the "Muro" on a patch at its centre; shoulder caps moulded close to
 // the arm (inside the body's outline), full greaves with knee cops, thigh tassets, a wide belt with two flat
 // pouches.
 sfondamento(w,m,o){const {M,D,W,H,A,I,X,B,L}=PAL,y=m.y,t=m.torso;
  w.panel(t,{s0:y(1.15),s1:y(1.49),aL:s=>-58+12*sstep(y(1.43),y(1.49),s),aR:s=>58-12*sstep(y(1.43),y(1.49),s),off:.014,th:.026,ns:14,na:18,bevel:.02},H,TORSO);
  w.panel(t,{s0:y(1.14),s1:y(1.5),aL:124,aR:236,off:.014,th:.024,ns:12,na:16,bevel:.02},H,TORSO);
  for(const s of [1,-1])w.panel(t,{s0:y(1.12),s1:y(1.33),aL:s>0?52:-128,aR:s>0?128:-52,off:.011,th:.016,ns:8,na:12,bevel:.012},D,TORSO);
  w.panel(t,{s0:y(1.29),s1:y(1.33),aL:-50,aR:50,off:.04,th:.005,ns:2,na:18,bevel:.0025},I,TORSO);
  [[1.085,.03],[1.035,.036],[.985,.042]].forEach(([yy,off],i)=>w.panel(t,{s0:y(yy),s1:y(yy+.072),aL:-46+i*5,aR:46-i*5,off:off-.016,th:.016,ns:4,na:14,bevel:.01},i===1?D:H,WAIST));
  w.patch(t,0,y(1.395),.04,'muro',.056,I,W,CHEST);
  w.panel(m.neck,{s0:m.ny(1.5),s1:m.ny(1.6),aL:-150,aR:150,off:.022,th:.016,edge:.004,ns:5,na:30,bevel:.012,reach:.08},H,COLLAR);
  w.place(rbox(.19,.22,.04,.014),t,180,y(1.3),.038,D,TORSO,{depth:.04});webbing(w,t,y,1.22,5,160,200,.08,TORSO);shoulderStraps(w,t,y,1.46,.042,TORSO);
  for(const [a,yy] of [[-44,1.2],[44,1.2],[-40,1.42],[40,1.42]])w.place(rbox(.014,.014,.008,.004),t,a,y(yy),.04,X,TORSO,{depth:.008});w.place(rbox(.14,.028,.044,.008),t,180,y(1.19),.038,W,TORSO,{depth:.044});
  for(const S of ['Left','Right']){const s=side(S),ar=m[S+'armS'],fo=m[S+'foreS'];
   w.panel(ar,{s0:.03,s1:.32,aL:s=>(s>0?20:-160)+10*sstep(.24,.32,s),aR:s=>(s>0?160:-20)-10*sstep(.24,.32,s),off:.004,th:.013,edge:.002,ns:9,na:12,bevel:.02},H,new RegExp('^'+S+'Arm$'));
   w.panel(ar,{s0:.29,s1:.32,aL:s>0?30:-150,aR:s>0?150:-30,off:.012,th:.003,edge:.001,ns:1,na:12,bevel:.0015},A,new RegExp('^'+S+'Arm$'));
   const sh=m[S+'shinS'],leg=new RegExp('^'+S+'Leg$');w.panel(sh,{s0:-.12,s1:.86,aL:s=>-62+14*sstep(.7,.86,s),aR:s=>62-14*sstep(.7,.86,s),off:.008,th:.015,edge:.003,ns:12,na:12,bevel:.016},H,leg);
   w.panel(sh,{s0:-.14,s1:.14,aL:-56,aR:56,off:.026,th:.014,ns:6,na:12,bevel:.01},D,leg);w.panel(sh,{s0:.16,s1:.8,aL:-6,aR:6,off:.026,th:.005,ns:10,na:2,bevel:.002},B,leg);
   ring(w,sh,.84,.95,.008,.012,B,new RegExp('^'+S+'(Leg|Foot)$'),{ns:3,na:28});
   w.panel(m[S+'thighS'],{s0:.06,s1:.4,aL:s>0?36:-136,aR:s>0?136:-36,off:.006,th:.013,edge:.003,ns:6,na:10,bevel:.016},H,new RegExp('^'+S+'UpLeg$'));
   w.panel(sh,{s0:-.1,s1:.12,aL:-4,aR:4,off:.04,th:.004,ns:4,na:2,bevel:.002},H,leg);for(const a of [-44,44])for(const q of [.24,.7])w.place(cylinder(.006,.004,10).rotateX(Math.PI/2),sh,a,q,.023,X,leg,{depth:.004});
   w.panel(m[S+'thighS'],{s0:.36,s1:.4,aL:s>0?40:-132,aR:s>0?132:-40,off:.019,th:.003,ns:1,na:10,bevel:.0015},D,new RegExp('^'+S+'UpLeg$'));}
  w.panel(t,{s0:y(.98),s1:y(1.06),aL:-180,aR:180,closed:true,off:.008,th:.016,ns:4,na:64,bevel:.006},W,WAIST);
  for(const s of [1,-1]){w.place(rbox(.08,.068,.03,.008),t,s*96,y(1.0),.022,D,WAIST,{depth:.03});w.place(rbox(.084,.022,.034,.006),t,s*96,y(1.03),.022,W,WAIST,{depth:.034});}
 },
 // TIRATORE, the shadow: no plate, dark close cloth. A real hood worn down: its rolled opening sits behind the neck and its
 // bag falls to a point between the shoulder blades, both in the team's colour so the shadow still reads as a team; a slim
 // stitched chest bib with four rounds, crossed straps behind, team bands high on both arms, the thigh's flat map pocket,
 // shins wrapped from ankle to knee, soft knee pads, the "Ago" on the right arm.
 tiratore(w,m,o){const {M,D,W,H,A,I,X,B,L,K,N}=PAL,y=m.y,t=m.torso,UP=/^(Spine1|Spine2|Neck|LeftShoulder|RightShoulder)$/;
  w.panel(m.neck,{s0:m.ny(1.505),s1:m.ny(1.59),aL:64,aR:296,off:.014,th:.03,edge:.008,ns:6,na:34,bevel:.03,bulge:.008,reach:.08,sag:(u,v)=>.005*Math.sin(u*Math.PI*6)*v},I,COLLAR);
  w.panel(t,{s0:y(1.27),s1:y(1.54),aL:s=>180-34*sstep(y(1.27),y(1.5),s),aR:s=>180+34*sstep(y(1.27),y(1.5),s),off:.022,th:.016,ns:14,na:16,bevel:.012,bulge:.01,sag:(u,v)=>.008*Math.sin(u*Math.PI)*(1-v)},I,UP);
  w.strap(t,[[180,y(1.29),.04],[180,y(1.37),.046],[180,y(1.48),.048]],.006,.003,.046,K,UP,10);
  // Chest bib, stitched in channels, with four rounds and a small tool pocket.
  w.panel(t,{s0:y(1.19),s1:y(1.38),aL:s=>-32+8*sstep(y(1.33),y(1.38),s),aR:s=>32-8*sstep(y(1.33),y(1.38),s),off:.01,th:.012,ns:10,na:14,bevel:.008},K,TORSO);
  for(const yy of [1.24,1.285,1.33])w.panel(t,{s0:y(yy),s1:y(yy+.004),aL:-29,aR:29,off:.022,th:.001,ns:1,na:12,bevel:.001},W,TORSO);
  for(let i=0;i<4;i++){const a=-6+i*7.5;w.place(cylinder(.0055,.05,10),t,a,y(1.345),.026,X,CHEST,{depth:.011});w.place(rbox(.016,.03,.016,.004),t,a,y(1.315),.022,W,CHEST,{depth:.016});}
  w.place(rbox(.07,.06,.026,.008),t,-20,y(1.225),.024,W,TORSO,{depth:.026});
  for(const s of [1,-1])w.strap(t,[[s*26,y(1.36)],[s*34,y(1.46)],[s*62,y(1.585)],[s*118,y(1.585)],[s*150,y(1.48),.016],[s*175,y(1.36),.016],[s*205,y(1.18)]],.032,.005,.018,W,TORSO,30);
  w.panel(t,{s0:y(1.005),s1:y(1.035),aL:-180,aR:180,closed:true,off:.005,th:.006,ns:2,na:64,bevel:.003},W,WAIST);w.place(rbox(.12,.08,.04,.012),t,180,y(1.03),.02,K,WAIST,{depth:.04});
  for(const S of ['Left','Right'])ring(w,m[S+'arm'],.34,.5,.003,.006,I,new RegExp('^'+S+'Arm$'),{na:28});
  w.patch(m.Rightarm,-88,.48,.004,'ago',.044,I,K,/^RightArm$/);
  w.panel(m.Leftthigh,{s0:.3,s1:.66,aL:40,aR:130,off:.008,th:.01,ns:8,na:8,bevel:.008},K,/^LeftUpLeg$/);w.panel(m.Leftthigh,{s0:.3,s1:.38,aL:40,aR:130,off:.016,th:.006,ns:2,na:8,bevel:.003},W,/^LeftUpLeg$/);
  for(const S of ['Left','Right']){const sh=m[S+'shin'],leg=new RegExp('^'+S+'(Leg|Foot)$');
   for(let i=0;i<7;i++){const s=.86-i*.095,k=i%2?1:-1;ring(w,sh,s-.06,s+.03,.004+i*.0004,.007,i%2?I:D,leg,{na:24,bevel:.004,sag:u=>.004*Math.sin(u*Math.PI*2)*k});}
   w.panel(sh,{s0:-.06,s1:.12,aL:-46,aR:46,off:.008,th:.012,ns:6,na:10,bevel:.012,bulge:.003},K,new RegExp('^'+S+'Leg$'));
   ring(w,m[S+'fore'],.74,.86,.004,.006,K,new RegExp('^'+S+'(ForeArm|Hand)$'));}
 },
 // RICOGNIZIONE, the light scout: an open field vest in two halves with stacked cargo pockets and a map pocket on the back, a
 // chunky scarf in the team's colour, a satchel on the right hip on its own strap, cargo pockets on the thighs, rolled cuffs,
 // ankle gaiters, the "Orecchio" on the left arm; on the head a soft field cap with a fitted brim and a neck flap.
 // V44 op2 MASTINO, armoured infantry, rebuilt on the soldier's own body (the bought-in figure was a painted, posed nude: no
 // armour of its own, a face under its visor, a skinny build). Segmented plates over the whole body in the team's tone on a
 // near-black quilted undersuit: a deep chest and back shell joined by side straps, three belly lames, a gorget, two-lame
 // pauldrons, vambraces with elbow cops, thigh plates, knee cops and full greaves, hip tassets; a closed helmet with a narrow
 // dark visor and a jaw guard (no face shows). Thin off-white seam bands on the shells' lower rims, the team's vivid band
 // across the chest and round the pauldrons: friend or foe at a glance.
 mastino(w,m,o){const {M,D,W,H,A,I,X,B,L,K,G}=PAL,y=m.y,t=m.torso,h=m.head;
  w.panel(t,{s0:y(1.15),s1:y(1.49),aL:s=>-64+16*sstep(y(1.4),y(1.49),s),aR:s=>64-16*sstep(y(1.4),y(1.49),s),off:.016,th:.026,ns:16,na:20,bevel:.022,bulge:.004},H,TORSO);
  w.panel(t,{s0:y(1.14),s1:y(1.5),aL:116,aR:244,off:.016,th:.024,ns:14,na:18,bevel:.02,bulge:.003},H,TORSO);
  w.panel(t,{s0:y(1.15),s1:y(1.17),aL:-60,aR:60,off:.04,th:.003,ns:1,na:20,bevel:.0015},L,TORSO);w.panel(t,{s0:y(1.14),s1:y(1.16),aL:120,aR:240,off:.038,th:.003,ns:1,na:18,bevel:.0015},L,TORSO);
  w.panel(t,{s0:y(1.38),s1:y(1.415),aL:-46,aR:46,off:.04,th:.004,ns:2,na:18,bevel:.002},I,CHEST);for(const yy of [1.25,1.31])w.panel(t,{s0:y(yy),s1:y(yy+.008),aL:-58,aR:58,off:.04,th:.003,ns:1,na:18,bevel:.0015},D,TORSO);
  for(const [a,yy] of [[-52,1.19],[52,1.19],[-48,1.44],[48,1.44],[150,1.2],[210,1.2]])w.place(rbox(.016,.016,.008,.004),t,a,y(yy),.04,X,TORSO,{depth:.008});
  for(const s of [1,-1])for(const yy of [1.2,1.32])w.panel(t,{s0:y(yy),s1:y(yy+.035),aL:s>0?62:-118,aR:s>0?118:-62,off:.012,th:.008,ns:2,na:10,bevel:.004},W,TORSO);
  [[1.075,.032],[1.02,.038],[.965,.044]].forEach(([yy,off],i)=>w.panel(t,{s0:y(yy),s1:y(yy+.068),aL:-50+i*4,aR:50-i*4,off:off-.018,th:.016,ns:4,na:16,bevel:.01},i===1?D:H,WAIST));
  w.panel(m.neck,{s0:m.ny(1.49),s1:m.ny(1.6),aL:-180,aR:180,closed:true,off:.02,th:.016,edge:.004,ns:5,na:32,bevel:.012,reach:.08},H,COLLAR);
  w.panel(t,{s0:y(.985),s1:y(1.045),aL:-180,aR:180,closed:true,off:.008,th:.016,ns:4,na:64,bevel:.006},W,WAIST);
  for(const s of [1,-1]){w.panel(t,{s0:y(.9),s1:y(1.0),aL:s>0?72:-132,aR:s>0?132:-72,off:.022,th:.014,ns:5,na:10,bevel:.01},H,WAIST);w.place(rbox(.07,.06,.03,.008),t,s*150,y(1.02),.024,D,WAIST,{depth:.03});}
  w.place(rbox(.2,.24,.05,.016),t,180,y(1.3),.044,D,TORSO,{depth:.05});w.place(rbox(.12,.03,.054,.008),t,180,y(1.42),.044,X,TORSO,{depth:.054});
  w.panel(t,{s0:y(1.19),s1:y(1.46),aL:-2.5,aR:2.5,off:.042,th:.004,ns:8,na:2,bevel:.002},H,TORSO);
  for(const S of ['Left','Right']){const s=side(S),ar=m[S+'armS'],fo=m[S+'foreS'],arm=new RegExp('^'+S+'Arm$'),fore=new RegExp('^'+S+'ForeArm$');
   w.panel(ar,{s0:.0,s1:.24,aL:s>0?-10:-190,aR:s>0?190:10,off:.006,th:.018,edge:.003,ns:9,na:16,bevel:.022,bulge:.004},H,arm);
   w.panel(ar,{s0:.2,s1:.36,aL:s>0?0:-180,aR:s>0?180:0,off:.012,th:.012,edge:.003,ns:6,na:14,bevel:.014},D,arm);
   w.panel(ar,{s0:.215,s1:.24,aL:s>0?10:-170,aR:s>0?170:-10,off:.03,th:.003,edge:.001,ns:1,na:14,bevel:.0015},I,arm);
   w.panel(fo,{s0:.16,s1:.86,aL:s>0?-60:-120,aR:s>0?240:300,off:.006,th:.013,edge:.003,ns:10,na:18,bevel:.016},H,fore);
   w.panel(fo,{s0:-.06,s1:.12,aL:s>0?60:-150,aR:s>0?150:-60,off:.012,th:.014,ns:4,na:8,bevel:.01},D,new RegExp('^'+S+'(Arm|ForeArm)$'));
   w.panel(m[S+'thighS'],{s0:.08,s1:.62,aL:s>0?-40:-140,aR:s>0?140:40,off:.008,th:.015,edge:.003,ns:9,na:14,bevel:.016},H,new RegExp('^'+S+'UpLeg$'));
   // V44 op4: a ridge down the greave and the vambrace, the thigh plate split in lames, rivets at the corners.
   {const th=m[S+'thighS'],up=new RegExp('^'+S+'UpLeg$');for(const q of [.26,.44])w.panel(th,{s0:q,s1:q+.012,aL:s>0?-36:-136,aR:s>0?136:36,off:.023,th:.002,ns:1,na:14,bevel:.001},D,up);
    for(const a of (s>0?[-30,126]:[-126,30]))for(const q of [.14,.56])w.place(cylinder(.0065,.004,10).rotateX(Math.PI/2),th,a,q,.023,X,up,{depth:.004});}
   w.panel(fo,{s0:.22,s1:.8,aL:s>0?86:-94,aR:s>0?94:-86,off:.019,th:.004,ns:8,na:2,bevel:.002},H,fore);
   const sh=m[S+'shinS'],leg=new RegExp('^'+S+'Leg$');w.panel(sh,{s0:.14,s1:.8,aL:-3,aR:3,off:.015,th:.004,ns:10,na:2,bevel:.002},H,leg);for(const q of [.38,.6])w.panel(sh,{s0:q,s1:q+.01,aL:-46,aR:46,off:.015,th:.0018,ns:1,na:12,bevel:.001},D,leg);
   for(const a of [-40,40])w.place(cylinder(.006,.004,10).rotateX(Math.PI/2),sh,a,.2,.015,X,leg,{depth:.004});
   w.panel(sh,{s0:.08,s1:.84,aL:s=>-50+8*sstep(.68,.84,s),aR:s=>50-8*sstep(.68,.84,s),off:.004,th:.011,edge:.003,ns:12,na:12,bevel:.012},H,leg);
   w.panel(sh,{s0:-.16,s1:.12,aL:-58,aR:58,off:.028,th:.015,ns:6,na:12,bevel:.01,bulge:.003},D,leg);w.panel(sh,{s0:.82,s1:.84,aL:-60,aR:60,off:.026,th:.003,ns:1,na:12,bevel:.0015},L,leg);
   ring(w,sh,.86,.95,.008,.012,B,new RegExp('^'+S+'(Leg|Foot)$'),{ns:3,na:28});}
  // The closed helmet: a shell over the whole head, the narrow visor band, a jaw guard and two ear housings.
  w.panel(h,{s0:-42,s1:88,aL:-180,aR:180,closed:true,off:.012,th:.01,edge:.004,ns:14,na:40,bevel:.01},H,HEAD);
  w.panel(h,{s0:-4,s1:13,aL:-62,aR:62,off:.024,th:.006,edge:.002,ns:3,na:20,bevel:.004},G,HEAD);
  w.panel(h,{s0:-44,s1:-8,aL:-70,aR:70,off:.022,th:.012,edge:.003,ns:5,na:18,bevel:.01},D,HEAD);
  w.panel(h,{s0:14,s1:30,aL:-55,aR:55,off:.022,th:.008,edge:.002,ns:3,na:16,bevel:.006},H,HEAD);
  for(const s of [1,-1])w.place(rbox(.05,.06,.022,.012),h,s*92,0,.018,D,HEAD,{depth:.022});
 },
 ricognizione(w,m,o){const {M,D,W,H,A,I,X,B,L,N}=PAL,y=m.y,t=m.torso;
  for(const s of [1,-1]){w.panel(t,{s0:y(1.1),s1:y(1.46),aL:s>0?12:-66,aR:s>0?66:-12,off:.008,th:.008,ns:12,na:12,bevel:.006},N,TORSO);
   for(const [a,yy] of [[s*37,1.17],[s*37,1.27]]){w.place(rbox(.074,.068,.024,.008,2),t,a,y(yy),.016,N,TORSO,{depth:.024});w.place(rbox(.078,.024,.028,.006),t,a,y(yy+.034),.016,D,TORSO,{depth:.028});}
   w.place(rbox(.04,.012,.006,.002),t,s*15,y(1.4),.018,A,CHEST,{depth:.006});}
  w.panel(t,{s0:y(1.1),s1:y(1.46),aL:110,aR:250,off:.008,th:.008,ns:12,na:16,bevel:.006},N,TORSO);w.place(rbox(.2,.16,.016,.01),t,180,y(1.28),.016,D,TORSO,{depth:.016});
  // The scarf: a soft thick roll round the neck with a loose end over the left chest.
  w.panel(m.neck,{s0:m.ny(1.5),s1:m.ny(1.585),aL:-180,aR:180,closed:true,off:.012,th:.026,edge:.008,ns:6,na:40,bevel:.03,bulge:.007,reach:.08,sag:(u,v)=>.004*Math.sin(u*Math.PI*10+v*2)},I,COLLAR);
  w.panel(t,{s0:y(1.36),s1:y(1.53),aL:s=>16+3*Math.sin(s*50),aR:s=>32+3*Math.sin(s*50),off:.022,th:.012,ns:6,na:4,bevel:.006,bulge:.003},I,CHEST);
  // Satchel on the right hip, strap over the left shoulder.
  w.place(rbox(.17,.15,.06,.016),t,-102,y(.99),.02,M,WAIST,{depth:.06,rot:4});w.place(rbox(.175,.06,.064,.012),t,-102,y(1.04),.02,D,WAIST,{depth:.064,rot:4});w.place(rbox(.03,.03,.008,.003),t,-102,y(1.03),.088,X,WAIST,{depth:.008,rot:4});
  w.strap(t,[[-100,y(1.07)],[-140,y(1.16)],[-180,y(1.27)],[-210,y(1.4)],[-250,y(1.52)],[-280,y(1.58)],[-320,y(1.5)],[-360,y(1.36)],[-400,y(1.2)],[-435,y(1.07)]],.03,.004,.024,W,TORSO,48);
  w.panel(t,{s0:y(1.0),s1:y(1.03),aL:-180,aR:180,closed:true,off:.005,th:.006,ns:2,na:64,bevel:.003},W,WAIST);
  w.patch(m.Leftarm,86,.34,.004,'orecchio',.042,I,D,/^LeftArm$/);
  for(const S of ['Left','Right']){const s=side(S),th=m[S+'thigh'],leg=new RegExp('^'+S+'UpLeg$');w.place(rbox(.1,.13,.036,.012),th,s*92,.5,.008,M,leg,{depth:.036});w.place(rbox(.104,.04,.04,.008),th,s*92,.37,.008,D,leg,{depth:.04});
   ring(w,m[S+'arm'],.86,.98,.004,.014,I,new RegExp('^'+S+'(Arm|ForeArm)$'),{ns:3,na:28,bevel:.006,bulge:.003});
   ring(w,m[S+'shin'],.74,.92,.006,.01,N,new RegExp('^'+S+'(Leg|Foot)$'),{ns:4,na:28,bevel:.006,bulge:.002});
   w.panel(m[S+'shin'],{s0:-.07,s1:.1,aL:-40,aR:40,off:.006,th:.008,ns:5,na:8,bevel:.008,bulge:.002},D,new RegExp('^'+S+'Leg$'));}
  if(!o.mask){const h=m.head;// the cap: crown, band, neck flap and a brim fitted to the band's curve
   w.panel(h,{s0:7,s1:86,aL:-180,aR:180,closed:true,off:.003,th:.006,ns:8,na:30,bevel:.004},N,HEAD);
   w.panel(h,{s0:5,s1:12,aL:-180,aR:180,closed:true,off:.008,th:.005,ns:2,na:32,bevel:.003},D,HEAD);
   w.panel(h,{s0:-44,s1:6,aL:118,aR:242,off:.007,th:.004,ns:6,na:12,bevel:.004,sag:(u,v)=>.012*(1-v)},N,HEAD);
   const up=new T.Vector3(0,1,0),down=up.clone().negate();
   w.push(slab((u,v,out)=>{const az=(-64+128*u)*R,len=.012+.046*Math.pow(Math.cos(az*1.2),.8),base=h.point(az,6*R,.009,out),dir=new T.Vector3(Math.sin(az),0,Math.cos(az));return out.copy(base).addScaledVector(dir,len*v).addScaledVector(up,-.012*v*v+.002*v);},24,4,.005,down,.12,.05),D,HEAD);}
 }
};
// The wear of one kit and toggles, built once per body (every operator shares the soldier's bind pose).
const built=new Map();let body=null,bodyKey=null,mapsOf=null;
export function wearGeometry(kit,o,suit,head){
 if(!WEAR_KITS.has(kit)||!suit)return null;const sg=suit.userData.baseSuitGeometry||suit.geometry,key=kit+':'+(kit==='ricognizione'?(o.mask?1:0):0)+':'+sg.uuid;if(built.has(key))return built.get(key);
 if(bodyKey!==sg.uuid){body=new Body(suit,sg,head);mapsOf=maps(body);bodyKey=sg.uuid;}
 const w=new Wear(body);KIT_WEAR[kit](w,mapsOf,o);const g=w.build();g.userData.tris=g.index.count/3;built.set(key,g);return g;}
