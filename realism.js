import * as THREE from './vendor/three.module.js';
import {SKIES} from './atmosphere.js?v=38.2';
import {surfaceRealism} from './surface-detail.js?v=38.2';
import {createMotes} from './ambient-particles.js?v=38.2';
// Physically motivated light balance per arena. Earlier releases flattened the
// image with a strong hemisphere fill; here direct sun and sky reflections carry
// the scene, leaving shape to shadows and ambient obscurance.
const PROFILES={
 caldera:{hemi:.4,ambient:1,sun:1.2,sunColor:0xfff0dc,environment:1.05,normal:2.4,fog:.0062,sky:SKIES.caldera,reflections:{paving:.5,quay:.45,deck:.5}},
 forge:{hemi:.42,ambient:1,sun:1.22,sunColor:0xfff2e2,environment:1.05,normal:2.6,fog:.0058,sky:SKIES.forge,reflections:{floor:.45}},
 sahra:{hemi:.82,bounce:[0xc6d8e8,0xd2aa78],ambient:1,sun:1.36,sunColor:0xffe2bd,sunPosition:[-82,64,-60],shadowBox:{left:-92,right:92,top:84,bottom:-84,near:1,far:260},environment:1.1,normal:2.7,fog:.0044,sky:SKIES.sahra,reflections:{tunnelFloor:.22,floor:.4,road:.45,paving:.5,sitePaving:.45},motes:{count:1100,color:0xe2cfaa,opacity:.26,size:.011},lamps:[[-40,3.9,14,26],[-40,3.9,1,26],[-40,3.9,-9,26],[-46,3.9,-21,26],[-20,3.45,-9,20]]}

};
const linear=c=>new THREE.Color().setRGB(c[0],c[1],c[2]);
export function realizeWorld(scene,mapId,{lamps=true}={}){
 const profile=PROFILES[mapId];if(!profile||scene.userData.realized)return;scene.userData.realized=true;
 let sun=null;
 scene.traverse(o=>{
  if(o.isHemisphereLight){o.intensity*=profile.hemi;if(profile.bounce){o.color.set(profile.bounce[0]);o.groundColor.set(profile.bounce[1]);}}
  else if(o.isAmbientLight)o.intensity*=profile.ambient;
  else if(o.isDirectionalLight&&o.castShadow){sun=o;o.intensity*=profile.sun;o.color.set(profile.sunColor);o.shadow.normalBias=Math.min(o.shadow.normalBias,.022);
   // A lower sun rakes the facades; the shadow box widens to keep the whole arena covered.
   if(profile.sunPosition){o.position.fromArray(profile.sunPosition);Object.assign(o.shadow.camera,profile.shadowBox);}o.shadow.camera.updateProjectionMatrix();}
  if(!o.isMesh)return;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(!m||m.userData.realized||!m.isMeshStandardMaterial)continue;m.userData.realized=true;
   // Restore authored surface relief that was attenuated for flat readability.
   if(m.normalMap&&m.normalScale)m.normalScale.multiplyScalar(profile.normal).clampScalar(-1.1,1.1);
   // Real building materials rarely exceed ~78% albedo; brighter flat paint clips under desert sun.
   const glowing=m.emissiveMap||(m.emissive&&m.emissive.getHex()!==0&&m.emissiveIntensity>.05);
   if(!m.map&&!glowing){const l=m.color.r*.2126+m.color.g*.7152+m.color.b*.0722;if(l>.72)m.color.multiplyScalar(.72/l);}
   // Untextured opaque paint, plaster and metal gain world-space micro-detail.
   if(!m.map&&!m.transparent&&!glowing&&m.roughness>.3)surfaceRealism(m,m.metalness>.35?{albedo:.1,bump:.006,roughness:.18,scale:2.2}:{albedo:.22,bump:.022,roughness:.12,scale:1.3});
  }
 });
 // Covered floors cannot see the open sky: keep their reflections to the surrounding stone.
 const materials=scene.children.find(o=>o.userData?.materials)?.userData.materials;
 for(const [key,value]of Object.entries(profile.reflections||{}))if(materials?.[key])materials[key].envMapIntensity=value;
 for(const [key,color]of Object.entries(profile.tints||{}))materials?.[key]?.color.set(color);
 // Practical lamps: warm pools under the authored fixtures, no shadow maps.
 if(lamps&&profile.motes)createMotes(scene,profile.motes);
 if(lamps)for(const [x,y,z,intensity]of profile.lamps||[]){const lamp=new THREE.PointLight(0xffc98f,intensity,15,2);lamp.position.set(x,y,z);scene.add(lamp);}
 const atmosphere=scene.userData.atmosphere;
 if(atmosphere&&profile.sky){atmosphere.setPalette(profile.sky);if(sun)atmosphere.setSun(sun.position);}
 if(profile.fog&&profile.sky){const haze=linear(profile.sky.horizon);scene.fog=new THREE.FogExp2(haze,profile.fog);scene.background=haze.clone();}
}
// Applied once the arena's reflection capture exists, since captures set their own intensity.
export function realizeEnvironment(scene,mapId){const profile=PROFILES[mapId];if(!profile||scene.userData.environmentRealized)return;scene.userData.environmentRealized=true;scene.environmentIntensity*=profile.environment;}
