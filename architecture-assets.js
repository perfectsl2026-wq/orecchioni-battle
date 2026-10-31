import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
const templates=new Map();let preparation,decalMaterial,detailNormal;
const assets={'caldera-cargo':[2.5,2.05,1.8]};
// Only the models a map in the pool still places are preloaded at startup.
export const ARCHITECTURE_IDS=Object.keys(assets);
export function preloadArchitecture(){
 if(preparation)return preparation;
 const loader=new GLTFLoader(),textures=new THREE.TextureLoader();
 const decoration=Promise.all([textures.loadAsync('./assets/models/v17/wayfinding.png'),textures.loadAsync('./assets/textures/v14/blue_metal_plate_nor_gl.webp')]).then(([atlas,normal])=>{atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=12;normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.anisotropy=12;detailNormal=normal;decalMaterial=new THREE.MeshStandardMaterial({map:atlas,roughness:.88,metalness:0});return 0;}).catch(error=>{console.warn('Architecture finish unavailable',error);return 1;});
 preparation=Promise.all([decoration,...Object.keys(assets).map(async id=>{
  try{const gltf=await loader.loadAsync('./assets/models/v17/'+id+'.glb');gltf.scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;o.material.envMapIntensity=.65;});templates.set(id,gltf.scene);return 0;}
  catch(error){console.warn('Architecture asset unavailable:',id,error);return 1;}
 })]).then(results=>results.reduce((sum,n)=>sum+n,0));return preparation;
}
export function placeArchitecture(root,id,x,z,width,depth,height,{rotation=0,signage=true}={}){
 const template=templates.get(id);if(!template)return null;
 const source=assets[id],model=template.clone(true);model.name='OB17 / '+id;model.position.set(x,0,z);model.rotation.y=rotation;model.scale.set(width/source[0],height/source[1],depth/source[2]);root.add(model);
 model.traverse(o=>{if(o.isMesh&&detailNormal){o.material.normalMap=detailNormal;o.material.normalScale=new THREE.Vector2(/Steel|Copper/.test(o.material.name)?.10:.045,/Steel|Copper/.test(o.material.name)?.10:.045);}});
 (root.userData.assetInstances??=[]).push({id,x,z,width,depth,height});
 if(signage&&id.endsWith('cargo')&&decalMaterial)for(const side of [-1,1])addMark(model,1,0,1.27,side*(source[2]/2+.064),1.43,.3575,side<0?Math.PI:0);
 return model;
}
function addMark(root,row,x,y,z,w,h,angle=0){
 const geometry=new THREE.PlaneGeometry(w,h),uv=geometry.attributes.uv;for(let n=0;n<uv.count;n++)uv.setY(n,(2-row+uv.getY(n))/3);
 const m=new THREE.Mesh(geometry,decalMaterial);m.position.set(x,y,z);m.rotation.y=angle;m.receiveShadow=true;m.castShadow=false;root.add(m);return m;
}
