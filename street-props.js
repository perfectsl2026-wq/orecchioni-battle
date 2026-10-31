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
import {MAPS} from './shared.js?v=38.2';
const DIR='./assets/models/v38/';
// Parts: a file, optionally a box (model units) that keeps only the triangles whose
// centroid lies inside it (packs of several objects), and a yaw so the part's front
// faces local +z. Every part is re-centred on its footprint with its base at y 0.
export const PARTS={
 condensatore:{file:'condizionatori',box:[[412,214,-338],[526,302,-291]],front:0},
 impianto:{file:'condizionatori',box:[[376,0,-225],[598,142,-60]],front:0},
 barile:{file:'barile'},
 sacco:{file:'sacco'},
 pallet:{file:'pallet',box:[[-2.6,-.1,-1.1],[-.4,.3,1.1]]},
 cassa:{file:'cassa',box:[[-1.7,-.1,.8],[1.7,2.2,3.2]]},
 barca:{file:'barca'},
 generatore:{file:'generatore'},
 cassonetto:{file:'cassonetto'}
};
const FILES=[...new Set(Object.values(PARTS).map(p=>p.file))];
const scenes=new Map(),parts=new Map();let loading=null;
function bake(scene){scene.updateMatrixWorld(true);const list=[];scene.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);list.push({geometry:g,material:o.material});});return list;}
function inside(geo,box){const pos=geo.attributes.position,keep=[],c=new T.Vector3(),v=new T.Vector3();
 for(let t=0;t<pos.count;t+=3){c.set(0,0,0);for(let k=0;k<3;k++)c.add(v.fromBufferAttribute(pos,t+k));c.multiplyScalar(1/3);if(c.x>=box[0][0]&&c.x<=box[1][0]&&c.y>=box[0][1]&&c.y<=box[1][1]&&c.z>=box[0][2]&&c.z<=box[1][2])keep.push(t);}
 if(!keep.length)return null;const out=new T.BufferGeometry();for(const n of Object.keys(geo.attributes)){const a=geo.attributes[n],arr=new a.array.constructor(keep.length*3*a.itemSize);let k=0;for(const t of keep)for(let v=0;v<3;v++)for(let c=0;c<a.itemSize;c++)arr[k++]=a.array[(t+v)*a.itemSize+c];out.setAttribute(n,new T.BufferAttribute(arr,a.itemSize,a.normalized));}return out;}
function buildPart(id){
 const spec=PARTS[id],baked=scenes.get(spec.file);if(!baked)return null;
 const byMat=new Map();for(const {geometry,material} of baked){const g=spec.box?inside(geometry,spec.box):geometry.clone();if(!g)continue;if(!byMat.has(material))byMat.set(material,[]);byMat.get(material).push(g);}
 const pieces=[];const bounds=new T.Box3();
 for(const [material,geos] of byMat){const merged=geos.length>1?mergeGeometries(geos,false):geos[0];if(!merged)continue;merged.computeBoundingBox();bounds.union(merged.boundingBox);pieces.push({material,geometry:merged});}
 if(!pieces.length)return null;
 const centre=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
 const m=new T.Matrix4().makeRotationY(spec.front||0).multiply(new T.Matrix4().makeTranslation(-centre.x,-bounds.min.y,-centre.z));
 for(const p of pieces){p.geometry.applyMatrix4(m);p.geometry.computeBoundingBox();p.geometry.computeBoundingSphere();p.material.userData.nonBallistic=true;p.material.userData.streetProp=true;}
 const part={pieces,size:(spec.front&&Math.abs(Math.sin(spec.front))>.5)?new T.Vector3(size.z,size.y,size.x):size};parts.set(id,part);return part;
}
export function loadStreetProps(){
 if(loading)return loading;
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 loading=Promise.all(FILES.map(async file=>{try{const g=await loader.loadAsync(DIR+file+'.glb');scenes.set(file,bake(g.scene));}catch(e){console.error('Arredo non caricato',file,e);}})).then(()=>{for(const id of Object.keys(PARTS))buildPart(id);return parts.size;});
 return loading;
}
export const partSize=id=>parts.get(id)?.size||null;
// ---- placement -----------------------------------------------------------------------
const hash=(x,z)=>{const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);};
export class StreetProps{
 constructor(){this.items=[];this.built=false;}
 // fit: {w,d,h} is the footprint the part must stay inside (after yaw); scale: explicit.
 add(part,{x,y=0,z,yaw=0,scale=1,fit=null,tag='prop'}){this.items.push({part,x,y,z,yaw,scale,fit,tag});return this;}
 async build(root){
  await loadStreetProps();if(this.built)return 0;this.built=true;
  // Re-skins are the rendered solid itself: their materials stay ballistic (the render
  // suites check every sightline against the collision box); clutter is cosmetic.
  const byPart=new Map();for(const it of this.items){if(!parts.has(it.part))continue;const key=it.part+(it.tag==='reskin'?'#solid':'');if(!byPart.has(key))byPart.set(key,[]);byPart.get(key).push(it);}
  let draws=0;const m=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3(),p=new T.Vector3();
  for(const [key,list] of byPart){
   const id=key.split('#')[0],solid=key.endsWith('#solid'),part=parts.get(id);
   const matrices=list.map(it=>{s.setScalar(it.scale);if(it.fit){const swap=Math.abs(Math.sin(it.yaw))>.5,fw=swap?it.fit.d:it.fit.w,fd=swap?it.fit.w:it.fit.d;s.set(fw/part.size.x,it.fit.h/part.size.y,fd/part.size.z);}
    return m.compose(p.set(it.x,it.y,it.z),q.setFromAxisAngle(T.Object3D.DEFAULT_UP,it.yaw),s).clone();});
   for(const piece of part.pieces){if(solid&&!piece.solidMaterial){piece.solidMaterial=piece.material.clone();piece.solidMaterial.userData={...piece.material.userData,nonBallistic:false};}const mesh=new T.InstancedMesh(piece.geometry,solid?piece.solidMaterial:piece.material,matrices.length);matrices.forEach((mat,i)=>mesh.setMatrixAt(i,mat));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='Arredo / '+id;mesh.userData.streetProp=id;root.add(mesh);draws++;}
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
 generatore(sp,x,y,z,yaw,r){sp.add('generatore',{x,y,z,yaw:yaw+Math.PI/2+(r-.5)*.4,scale:.001,tag:'roof'});}
};
const RECIPE_KEYS=Object.keys(RECIPES);
// Roof clutter: for every solid block beside a walkable space, one cluster a metre in
// from the parapet on the side that faces the street, chosen and offset by hash so the
// skyline varies; nothing on roofs higher than `maxHeight` (too far to read).
export function roofClutter(sp,map,{walkable,maxHeight=10,inset=1.05,cap=()=>0,chance=.62,seed=0,minArea=30}={}){
 let placed=0;
 for(const w of map.walls){
  const [x,z,wd,dp,h,kind,base,role]=w;if(kind!==0||role||h>maxHeight||wd*dp<minArea||Math.min(wd,dp)<3)continue;
  const sides=[[0,1],[0,-1],[1,0],[-1,0]];const r0=hash(x+seed,z-seed);if(r0>chance)continue;
  const order=sides.map((sd,i)=>[sd,hash(x*3+i,z*7+seed)]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
  for(const [nx,nz] of order){
   const half=nx?wd/2:dp/2,along=nx?dp:wd;const ex=x+nx*(half+1.6),ez=z+nz*(half+1.6);if(!walkable(ex,ez))continue;
   const t=(hash(x*5+nx,z*5+nz+seed)-.5)*Math.max(0,along-4);
   const px=x+nx*(half-inset)+(nx?0:t),pz=z+nz*(half-inset)+(nz?0:t),yaw=Math.atan2(nx,nz);
   const r=hash(x*11+seed,z*13);const recipe=RECIPE_KEYS[Math.floor(r*RECIPE_KEYS.length)%RECIPE_KEYS.length];
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
// Boats moored on Caldera's open water, outside every parapet.
export function calderaBoats(sp){
 for(const [x,z,yaw] of [[-31.5,-7,.5],[-30,2.5,-.9],[1.5,35.5,2.1],[30.5,12,1.3]])sp.add("barca",{x,y:-1.45,z,yaw,scale:.012,tag:"sea"});
}
export const streetPropsFor=id=>MAPS[id]?.streetProps;
