import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
export const KITS={service:{label:'Service / originale'},rail:{label:'Machined / pannelli lavorati'},field:{label:'Field / protezioni tessili'}};
// Cosmetic receiver furniture; barrel, sights, grip and muzzle stay in place.
// Each root builds its two optional sets once, then only changes visibility.
export function applyKit(root,index,key='service'){
 if(!root||!Object.hasOwn(KITS,key))return;
 if(key==='service'&&!root.userData.cosmeticKits)return;
 if(!root.userData.cosmeticKits){
  root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),bounds=new T.Box3(),matrix=new T.Matrix4();
  root.traverse(o=>{if(!o.isMesh||o.material?.isMeshBasicMaterial)return;o.geometry.computeBoundingBox();matrix.multiplyMatrices(inverse,o.matrixWorld);bounds.union(o.geometry.boundingBox.clone().applyMatrix4(matrix));});
  if(bounds.isEmpty())return;
  const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),sets=new Map();
  for(const name of ['rail','field']){
   const group=new T.Group();group.name='Cosmetic / '+name;root.add(group);sets.set(name,group);
   const dark=new T.MeshStandardMaterial({color:name==='field'?0x687568:0x34434b,roughness:name==='field'?.94:.48,metalness:name==='field'?0:.55});dark.userData.finishRole='accent';
   const metal=new T.MeshStandardMaterial({color:0xa0acaf,roughness:.42,metalness:.72});metal.userData.finishRole='accent';
   const x=size.x*.38,y=center.y+size.y*.16,z=center.z-size.z*.08,length=size.z*(index===5?.23:.26),height=Math.min(size.y*.21,size.x*.5);
   const add=(m,px,py,pz,w,h,d)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(px,py,pz);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.ownedGeometry=true;group.add(mesh);return mesh;};
   for(const side of [-1,1]){
    add(dark,center.x+side*x,y,z,size.x*.15,height,length);
    for(let n=0;n<7;n++)add(name==='field'?dark:metal,center.x+side*(x+size.x*.085),y,z-length*.42+n*length*.14,size.x*.04,height*(name==='field'?1.2:.34),length*.045);
   }
   // Two material batches, instead of dozens of per-slot draw calls.
   for(const material of [dark,metal]){const parts=group.children.filter(o=>o.material===material);if(!parts.length)continue;const geos=parts.map(o=>{o.updateMatrix();return o.geometry.clone().applyMatrix4(o.matrix);});const geometry=mergeGeometries(geos);for(const geo of geos)geo.dispose();for(const part of parts){part.geometry.dispose();group.remove(part);}const batch=new T.Mesh(geometry,material);batch.castShadow=batch.receiveShadow=true;batch.userData.ownedGeometry=true;group.add(batch);}
   if(index===5){group.position.z+=size.z*.3;group.scale.y=.7;}
  }
  root.userData.cosmeticKits=sets;
 }
 for(const [name,group]of root.userData.cosmeticKits)group.visible=name===key&&!group.userData.kitHidden;
}
export function prepareKits(root,index){applyKit(root,index,'rail');applyKit(root,index,'service');}
