// V38 street dressing: photographed props (Sketchfab CC-BY, credits in assets/CREDITS.md)
// that give the three districts a lived-in look without touching play. Two kinds:
//  - cosmetic clutter placed where nobody walks (roof edges above the streets, wall
//    condensers above head height, boats on the open water): instanced, no collision,
//    flagged nonBallistic like the wires and lanterns;
//  - re-skins of authored cover: dumpsters stretched to the exact
//    collision box of the pod or low wall they replace, so hits and movement do not
//    change by a centimetre.
// Models load after the district is built and appear as one instanced draw per part.
import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/addons/libs/meshopt_decoder.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {MAPS} from './shared.js?v=40.0';
const DIR='./assets/models/';
// Parts: a file, optionally a box (model units) that keeps only the triangles whose
// centroid lies inside it (packs of several objects), and a yaw so the part's front
// faces local +z. Every part is re-centred on its footprint with its base at y 0.
export const PARTS={
 condensatore:{file:'v38/condizionatori',box:[[412,214,-338],[526,302,-291]],front:0},
 impianto:{file:'v38/condizionatori',box:[[376,0,-225],[598,142,-60]],front:0},
 barile:{file:'v38/barile'},
 sacco:{file:'v38/sacco'},
 pallet:{file:'v38/pallet',box:[[-2.6,-.1,-1.1],[-.4,.3,1.1]]},
 cassa:{file:'v38/cassa',box:[[-1.7,-.1,.8],[1.7,2.2,3.2]]},
 barca:{file:'v38/barca'},
 generatore:{file:'v38/generatore'},
 cassonetto:{file:'v38/cassonetto'},
 // V39: photographed cover and street fixtures.
 cassa_piccola:{file:'v39/casse',box:[[-.2,-.1,-.2],[.2,.4,.2]]},
 cassa_larga:{file:'v39/casse',box:[[-.62,-.1,-.25],[-.24,.4,.25]]},
 cassa_alta:{file:'v39/casse',box:[[.24,-.1,-.25],[.65,.7,.25]]},
 compensato:{file:'v39/compensato'},
 container:{file:'v39/container'},
 container_b:{file:'v39/container_b'},
 palma:{file:'v39/palma',leaves:'palm'},
 quadro:{file:'v39/quadro'},
 plafoniera:{file:'v39/plafoniera',front:Math.PI,shadow:false},
 // V40: rot is applied to the model before it is re-centred; wind names a vertex motion.
 porta:{file:'v40/porta',front:Math.PI/2},
 lanterna:{file:'v40/lanterna',glow:0xffb765,solidAlpha:true},
 tappeto:{file:'v40/tappeto',rot:[Math.PI/2,0,0],shadow:false},
 tappeto_b:{file:'v40/tappeto_b',rot:[Math.PI/2,0,0],shadow:false},
 bucato:{file:'v40/bucato',wind:'cloth'},
 parabola:{file:'v40/parabola'},
 cisterna:{file:'v40/cisterna',box:[[-7.4,-7,-74],[-5.45,-5,-70]]},
 tombino:{file:'v40/tombino',shadow:false},
 sacchi:{file:'v40/sacchi'},
 vaso_piccolo:{file:'v40/vasi',box:[[-26,-1,8],[0,36,34]],shadow:false},
 vaso_alto:{file:'v40/vasi',box:[[0,-1,-83],[36,68,-48]],shadow:false},
 palma_lontana:{file:'v40/palma_lontana',shadow:false},
 nave:{file:'v40/nave',shadow:false},
 gru:{file:'v40/gru',shadow:false},
 faro:{file:'v40/faro',shadow:false},
 boa:{file:'v40/boa',shadow:false,wind:'bob'},
 salvagente:{file:'v40/salvagente',rot:[Math.PI/2,0,0],shadow:false},
 turbina:{file:'v40/turbina',shadow:false,wind:'rotor'},
 solare:{file:'v40/solare'},
 scoglio:{file:'v40/roccia',box:[[2.2,-.2,-3.5],[5.9,3.2,-1.6]],shadow:false},
 isola:{file:'v40/roccia',box:[[-2.4,-.2,-4],[2.4,2.2,-1.2]],shadow:false},
 molo:{file:'v40/roccia',box:[[-2.4,-.2,-4],[2.4,2.2,-1.2]],shadow:false},
 traliccio:{file:'v40/traliccio',shadow:false},
 abete:{file:'v40/abete',shadow:false},
 valvola:{file:'v40/valvola',matte:.35,front:Math.PI/2,shadow:false},
 estintore:{file:'v40/estintore',shadow:false},
 telecamera:{file:'v40/telecamera',shadow:false},
 scala:{file:'v40/scala',shadow:false},
 condotto:{file:'v40/condotto',matte:.25,box:[[20,420,-385],[515,595,-205]],shadow:false}
};
const FILES=[...new Set(Object.values(PARTS).map(p=>p.file))];
const scenes=new Map(),parts=new Map();
function bake(scene){scene.updateMatrixWorld(true);const list=[];scene.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);list.push({geometry:g,material:o.material});});return list;}
function inside(geo,box){const pos=geo.attributes.position,keep=[],c=new T.Vector3(),v=new T.Vector3();
 for(let t=0;t<pos.count;t+=3){c.set(0,0,0);for(let k=0;k<3;k++)c.add(v.fromBufferAttribute(pos,t+k));c.multiplyScalar(1/3);if(c.x>=box[0][0]&&c.x<=box[1][0]&&c.y>=box[0][1]&&c.y<=box[1][1]&&c.z>=box[0][2]&&c.z<=box[1][2])keep.push(t);}
 if(!keep.length)return null;const out=new T.BufferGeometry();for(const n of Object.keys(geo.attributes)){const a=geo.attributes[n],arr=new a.array.constructor(keep.length*3*a.itemSize);let k=0;for(const t of keep)for(let v=0;v<3;v++)for(let c=0;c<a.itemSize;c++)arr[k++]=a.array[(t+v)*a.itemSize+c];out.setAttribute(n,new T.BufferAttribute(arr,a.itemSize,a.normalized));}return out;}
// Wind in the vertex shader, on one shared clock: no per-frame JavaScript per object.
export const streetClock={value:0};
const WIND={
 palm:'float wH=smoothstep(2.4,7.,position.y);transformed.x+=wH*sin(uStreetClock*1.1+wP+position.y*.6)*.08;transformed.z+=wH*cos(uStreetClock*.8+wP+position.x*.8)*.06;',
 cloth:'float wH=smoothstep(8.6,3.6,position.y);transformed.x+=wH*sin(uStreetClock*1.7+wP+position.z*.7)*.34;',
 bob:'transformed.y+=sin(uStreetClock*.9+wP)*.05;transformed.xz+=vec2(sin(uStreetClock*.7+wP),cos(uStreetClock*.6+wP))*.03*position.y;',
 rotor:'if(position.z>.2||position.y>13.6){float wA=uStreetClock*1.05+wP;vec2 wQ=position.xy-vec2(0.,14.81);transformed.xy=vec2(wQ.x*cos(wA)-wQ.y*sin(wA),wQ.x*sin(wA)+wQ.y*cos(wA))+vec2(0.,14.81);}'
};
function windMotion(material,kind,leavesOnly=false){
 if(leavesOnly&&!(material.alphaTest>0))return;
 material.onBeforeCompile=shader=>{shader.uniforms.uStreetClock=streetClock;shader.vertexShader='uniform float uStreetClock;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat wP=instanceMatrix[3].x*.7+instanceMatrix[3].z*.5;'+WIND[kind]+'\n#endif');};
 material.customProgramCacheKey=()=>'street-wind-'+kind;
}
function buildPart(id){
 const spec=PARTS[id],baked=scenes.get(spec.file);if(!baked)return null;
 const byMat=new Map();for(const {geometry,material} of baked){const g=spec.box?inside(geometry,spec.box):geometry.clone();if(!g)continue;if(spec.rot)g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...spec.rot)));if(!byMat.has(material))byMat.set(material,[]);byMat.get(material).push(g);}
 const pieces=[];const bounds=new T.Box3();
 for(const [material,geos] of byMat){const merged=geos.length>1?mergeGeometries(geos,false):geos[0];if(!merged)continue;merged.computeBoundingBox();bounds.union(merged.boundingBox);pieces.push({material,geometry:merged});}
 if(!pieces.length)return null;
 const centre=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
 const m=new T.Matrix4().makeRotationY(spec.front||0).multiply(new T.Matrix4().makeTranslation(-centre.x,-bounds.min.y,-centre.z));
 for(const p of pieces){p.geometry.applyMatrix4(m);p.geometry.computeBoundingBox();p.geometry.computeBoundingSphere();p.material.userData.nonBallistic=true;p.material.userData.streetProp=true;if(spec.matte){p.material.metalness=spec.matte;p.material.metalnessMap=null;p.material.roughness=Math.max(.55,p.material.roughness);}if(spec.leaves)windMotion(p.material,spec.leaves,true);if(spec.solidAlpha){p.material.transparent=false;p.material.alphaTest=.35;}if(spec.glow){p.material.emissive.set(spec.glow);p.material.emissiveMap=p.material.map;p.material.emissiveIntensity=1.5;}if(spec.wind)windMotion(p.material,spec.wind);}
 const part={pieces,size:(spec.front&&Math.abs(Math.sin(spec.front))>.5)?new T.Vector3(size.z,size.y,size.x):size};parts.set(id,part);return part;
}
// Only the files a map uses are downloaded: a palm has no business on Forge's first load.
const fileLoads=new Map();
export async function loadStreetProps(files=FILES){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 await Promise.all(files.map(file=>{if(!fileLoads.has(file))fileLoads.set(file,loader.loadAsync(DIR+file+'.glb').then(g=>{scenes.set(file,bake(g.scene));}).catch(e=>console.error('Arredo non caricato',file,e)));return fileLoads.get(file);}));
 for(const id of Object.keys(PARTS))if(!parts.has(id)&&scenes.has(PARTS[id].file))buildPart(id);
 // Dark core inside a photographed crate: slatted models are not watertight and the box behind them must still stop a sightline.
 if(!parts.has('nucleo')){const core=new T.BoxGeometry(1,1,1);core.translate(0,.5,0);parts.set('nucleo',{pieces:[{geometry:core,material:new T.MeshStandardMaterial({color:0x1c1712,roughness:.95})}],size:new T.Vector3(1,1,1)});}
 if(!parts.has('nucleo_compensato')){const core=new T.BoxGeometry(1,1,1);core.translate(0,.5,0);parts.set('nucleo_compensato',{pieces:[{geometry:core,material:new T.MeshStandardMaterial({map:plyEdge(),roughness:.9})}],size:new T.Vector3(1,1,1)});}
 return parts.size;
}
// The plywood model has no end faces: its core shows the sheet edges, made of stripes so it also builds in Node.
function plyEdge(){const h=96,data=new Uint8Array(4*4*h);for(let y=0;y<h;y++){const seam=y%6===0,tone=(seam?.42:.78+hash(y,3.1)*.2);for(let x=0;x<4;x++){const i=(y*4+x)*4;data[i]=196*tone;data[i+1]=158*tone;data[i+2]=108*tone;data[i+3]=255;}}const t=new T.DataTexture(data,4,h);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearFilter;t.needsUpdate=true;return t;}
export const partSize=id=>parts.get(id)?.size||null;
// ---- placement -----------------------------------------------------------------------
const hash=(x,z)=>{const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);};
export class StreetProps{
 constructor(){this.items=[];this.built=false;}
 // fit: {w,d,h} is the footprint the part must stay inside (after yaw); scale: explicit.
 // fallback: draws the procedural original when the model cannot be loaded, so a re-skinned solid is never invisible.
 add(part,{x,y=0,z,yaw=0,scale=1,fit=null,tag='prop',fallback=null}){this.items.push({part,x,y,z,yaw,scale,fit,tag,fallback});return this;}
 async build(root){
  await loadStreetProps([...new Set(this.items.map(it=>PARTS[it.part]?.file).filter(Boolean))]);if(this.built)return 0;this.built=true;
  // Re-skins are the rendered solid itself: their materials stay ballistic (the render
  // suites check every sightline against the collision box); clutter is cosmetic.
  const byPart=new Map(),fellBack=new Set();for(const it of this.items){if(!parts.has(it.part)){if(it.fallback&&!fellBack.has(it.fallback)){fellBack.add(it.fallback);it.fallback();}continue;}// Instances are grouped by 36 m cells: a group is drawn whole, so one crate in view must not pull in the whole map.
   const key=it.part+(it.tag==='reskin'?'#solid':'')+'|'+(it.tag==='far'?'':Math.floor(it.x/36)+','+Math.floor(it.z/36));if(!byPart.has(key))byPart.set(key,[]);byPart.get(key).push(it);}
  let draws=0;const m=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3(),p=new T.Vector3();
  for(const [key,list] of byPart){
   const [head]=key.split('|'),id=head.split('#')[0],solid=head.endsWith('#solid'),part=parts.get(id);
   const matrices=list.map(it=>{s.setScalar(it.scale);if(it.fit){const swap=Math.abs(Math.sin(it.yaw))>.5,fw=swap?it.fit.d:it.fit.w,fd=swap?it.fit.w:it.fit.d;s.set(fw/part.size.x,it.fit.h/part.size.y,fd/part.size.z);}
    return m.compose(p.set(it.x,it.y,it.z),q.setFromAxisAngle(T.Object3D.DEFAULT_UP,it.yaw),s).clone();});
   for(const piece of part.pieces){if(solid&&!piece.solidMaterial){piece.solidMaterial=piece.material.clone();piece.solidMaterial.userData={...piece.material.userData,nonBallistic:false};}const mesh=new T.InstancedMesh(piece.geometry,solid?piece.solidMaterial:piece.material,matrices.length);matrices.forEach((mat,i)=>mesh.setMatrixAt(i,mat));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=PARTS[id]?.shadow!==false;mesh.receiveShadow=true;mesh.name='Arredo / '+id;mesh.userData.streetProp=id;root.add(mesh);draws++;}
  }
  return draws;
 }
}
// ---- clutter recipes ------------------------------------------------------------------
// Each recipe lays its pieces around a point on a roof edge; `yaw` turns the group so
// local +z looks over the parapet towards the street.
const RECIPES={
 barili(sp,x,y,z,yaw,r){const c=Math.cos(yaw),s=Math.sin(yaw),at=(u,v)=>[x+c*u+s*v,z-s*u+c*v];for(const [u,v,t] of [[-.38,.0,.2],[.34,.1,1.4],[-.02,-.62,2.7]].slice(0,2+(r>.5?1:0))){const [px,pz]=at(u,v);sp.add('barile',{x:px,y,z:pz,yaw:yaw+t,scale:.3,tag:'roof'});}},
 pallet(sp,x,y,z,yaw,r){sp.add('pallet',{x,y,z,yaw,scale:.56,tag:'roof'});sp.add('cassa',{x:x+Math.cos(yaw)*.16,y:y+.14,z:z-Math.sin(yaw)*.16,yaw:yaw+.3+r,scale:.2,tag:'roof'});},
 sacchi(sp,x,y,z,yaw,r){const c=Math.cos(yaw),s=Math.sin(yaw);for(let i=0;i<4;i++){const u=(i-1.5)*.5;sp.add('sacco',{x:x+c*u,y,z:z-s*u,yaw:yaw+Math.PI/2+(hash(u,r)-.5)*.3,scale:1,tag:'roof'});}sp.add('sacco',{x:x+c*.25,y:y+.24,z:z-s*.25,yaw:yaw+Math.PI/2+.1,scale:1,tag:'roof'});},
 impianto(sp,x,y,z,yaw){sp.add('impianto',{x,y,z,yaw:yaw+Math.PI/2,scale:.01,tag:'roof'});},
 cisterne(sp,x,y,z,yaw,r){const c=Math.cos(yaw),s=Math.sin(yaw);sp.add('cisterna',{x:x+c*.7,y,z:z-s*.7,yaw:r*6,scale:1.35,tag:'roof'});if(r>.4)sp.add('cisterna',{x:x-c*.7,y,z:z+s*.7,yaw:r*3,scale:1.1,tag:'roof'});},
 parabole(sp,x,y,z,yaw,r){const c=Math.cos(yaw),s=Math.sin(yaw);sp.add('parabola',{x:x+c*.5,y,z:z-s*.5,yaw:yaw+r,scale:.0042,tag:'roof'});if(r>.5)sp.add('parabola',{x:x-c*.8,y,z:z+s*.8,yaw:yaw-r,scale:.0034,tag:'roof'});},
 solari(sp,x,y,z,yaw){const c=Math.cos(yaw),s=Math.sin(yaw);for(const u of [-1.25,1.25])sp.add('solare',{x:x+c*u,y,z:z-s*u,yaw:yaw+Math.PI,scale:.0125,tag:'roof'});},
 generatore(sp,x,y,z,yaw,r){sp.add('generatore',{x,y,z,yaw:yaw+Math.PI/2+(r-.5)*.4,scale:.001,tag:'roof'});}
};
const ALL_RECIPES=Object.keys(RECIPES);
// Roof clutter: for every solid block beside a walkable space, one cluster a metre in
// from the parapet on the side that faces the street, chosen and offset by hash so the
// skyline varies; nothing on roofs higher than `maxHeight` (too far to read).
export function roofClutter(sp,map,{walkable,maxHeight=10,inset=1.05,cap=()=>0,chance=.62,seed=0,minArea=30,recipes=ALL_RECIPES}={}){
 let placed=0;
 for(const w of map.walls){
  const [x,z,wd,dp,h,kind,base,role]=w;if(kind!==0||role||h>maxHeight||wd*dp<minArea||Math.min(wd,dp)<3)continue;
  const sides=[[0,1],[0,-1],[1,0],[-1,0]];const r0=hash(x+seed,z-seed);if(r0>chance)continue;
  const order=sides.map((sd,i)=>[sd,hash(x*3+i,z*7+seed)]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
  for(const [nx,nz] of order){
   const half=nx?wd/2:dp/2,along=nx?dp:wd;const ex=x+nx*(half+1.6),ez=z+nz*(half+1.6);if(!walkable(ex,ez))continue;
   const t=(hash(x*5+nx,z*5+nz+seed)-.5)*Math.max(0,along-4);
   const px=x+nx*(half-inset)+(nx?0:t),pz=z+nz*(half-inset)+(nz?0:t),yaw=Math.atan2(nx,nz);
   const r=hash(x*11+seed,z*13);const recipe=recipes[Math.floor(r*recipes.length)%recipes.length];
   RECIPES[recipe](sp,px,h+cap(w),pz,yaw,r);placed++;break;
  }
 }
 return placed;
}
// Wall condensers on long street facades, well above head height, on the facade's own
// frame (u along the wall, out of it along local +z).
export function facadeCondenser(sp,{x,z,width,height,angle,serial,ground=0}){
 if(width<4.5||height<4.6||serial%3!==1)return false;
 const r=hash(serial*3.1,width),u=(r-.5)*(width-2.4),out=.24,y=ground+3.05+hash(serial,7)*.7;
 if(y>height-1.2)return false;
 sp.add('condensatore',{x:x+Math.cos(angle)*u+Math.sin(angle)*out,y,z:z-Math.sin(angle)*u+Math.cos(angle)*out,yaw:angle,scale:.01,tag:'facade'});return true;
}
// ---- cover re-skins ------------------------------------------------------------------
// Keyed by the authored cover's x,z. The part is stretched to the exact collision box, so only
// near-box shapes qualify (a forklift, a trailer or a sloped jersey barrier would leave
// the box's air stopping shots).
export const RESKINS={
 caldera:{
  '9.4,-8.8':{part:'cassonetto',yaw:0},
  '-5.6,-30.4':{part:'cassonetto',yaw:Math.PI/2}
 },
 forge:{}
};
export function reskin(sp,mapId,x,z,w,d,top,base=0){
 const spec=RESKINS[mapId]?.[x+','+z];if(!spec)return false;const h=top-base,n=spec.count||1;
 for(let i=0;i<n;i++){const t=n>1?(i-(n-1)/2)*(w/n):0;sp.add(spec.part,{x:x+t,y:base,z,yaw:spec.yaw,fit:{w:w/n,d,h},tag:'reskin'});}
 return true;
}
// Photographed cover (V39): the collision box is filled exactly by a grid of models, so
// hits and movement do not change. Crates split into cells of about 1.25 m (a single 2.4 m
// crate reads as a toy), timber stacks into plywood pallets, metal pods into containers.
// grow: slatted crates stop short of their corners, so the model overlaps the box by a hair and the box never stops a shot in thin air.
function fillBox(sp,part,{x,z,w,d,base,nx=1,ny=1,nz=1,h,yaw=0,core=0,coreId='nucleo',grow=0,fallback}){
 const sx=w/nx,sy=h/ny,sz=d/nz;
 for(let i=0;i<nx;i++)for(let k=0;k<nz;k++)for(let j=0;j<ny;j++){const px=x-w/2+sx*(i+.5),pz=z-d/2+sz*(k+.5),id=typeof part==='function'?part(px,pz,j):part,turn=hash(px*3.1,pz*1.7+j)>.5?Math.PI:0;sp.add(id,{x:px,y:base+sy*j,z:pz,yaw:yaw+turn,fit:{w:sx+grow,d:sz+grow,h:sy},tag:'reskin',fallback});if(core)sp.add(coreId,{x:px,y:base+sy*j,z:pz,fit:{w:sx-core,d:sz-core,h:sy-core/2},tag:'reskin'});}
}
export function coverSkin(sp,kind,{x,z,w,d,top,base,fallback}){
 const h=top-base;
 if(kind==='pod'){const long=Math.max(w,d)/Math.min(w,d)>1.15;fillBox(sp,hash(x,z)>.45?'container_b':'container',{x,z,w,d,h,base,yaw:long&&w>d?Math.PI/2:0,fallback});return;}
 if(kind==='timber'){const layers=Math.max(1,Math.round(h/.62));fillBox(sp,'compensato',{x,z,w,d,h,base,ny:layers,yaw:d>=w?Math.PI/2:0,core:.1,coreId:'nucleo_compensato',fallback});return;}
 const nx=Math.max(1,Math.round(w/1.25)),nz=Math.max(1,Math.round(d/1.25)),cell=Math.max(w/nx,d/nz);
 if(h/cell>1.25){fillBox(sp,'cassa_alta',{x,z,w,d,h,base,nx,nz,core:.12,grow:.1,fallback});return;}
 fillBox(sp,(px,pz)=>hash(px*1.3,pz*2.1)>.5?'cassa_larga':'cassa_piccola',{x,z,w,d,h,base,nx,nz,core:.12,grow:.1,fallback});
}
// Fixtures on the facade frame, above the 1.0–2.0 m head band and away from the condensers.
export function facadeFixture(sp,{x,z,width,height,angle,serial,ground=0}){
 if(width<3.4||height<3.6)return false;const kind=serial%3,u=(hash(serial*1.7,width)>.5?1:-1)*(width/2-.9),put=(part,y,out,scale)=>sp.add(part,{x:x+Math.cos(angle)*u+Math.sin(angle)*out,y,z:z-Math.sin(angle)*u+Math.cos(angle)*out,yaw:angle,scale,tag:'facade'});
 if(kind===2){put('quadro',ground+1.98,.14,.15);return true;}
 if(kind===0){put('plafoniera',ground+3.2,.14,.0011);return true;}
 return false;
}
// Forge's perimeter walls have no facade hook: fixtures above the head band.
export function forgeWallDress(sp){
 const put=(part,x,y,z,angle,out,scale)=>sp.add(part,{x:x+Math.sin(angle)*out,y,z:z+Math.cos(angle)*out,yaw:angle,scale,tag:'facade'});
 for(const side of [-1,1]){
  const za=side<0?0:Math.PI,xa=side<0?Math.PI/2:-Math.PI/2;
  for(const u of [-11,11])put('quadro',u,2.62,side*19.5,za,.05,.2);
  for(const u of [-8.5,8.5])put('quadro',side*17.5,2.62,u,xa,.05,.2);
  for(const u of [-5.8,5.8])put('plafoniera',u,2.9,side*19.5,za,.05,.0016);
  put('plafoniera',side*17.5,2.9,0,xa,.05,.0016);
 }
}
// Boats moored on Caldera's open water, outside every parapet.
export function calderaBoats(sp){
 for(const [x,z,yaw] of [[-31.5,-7,.5],[-30,2.5,-.9],[1.5,35.5,2.1],[30.5,12,1.3]])sp.add("barca",{x,y:-1.45,z,yaw,scale:.012,tag:"sea"});
}
export const streetPropsFor=id=>MAPS[id]?.streetProps;
