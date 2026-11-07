import * as THREE from './vendor/three.module.js';
import {SKIES} from './atmosphere.js?v=42.0';
import {surfaceRealism} from './surface-detail.js?v=42.0';
import {liteWorld} from './horizon.js?v=42.0';
import {createMotes} from './ambient-particles.js?v=42.0';
// Physically motivated light balance per arena. Earlier releases flattened the
// image with a strong hemisphere fill; here direct sun and sky reflections carry
// the scene, leaving shape to shadows and ambient obscurance.
const PROFILES={
 caldera:{hemi:.3,ambient:1,sun:1.36,sunColor:0xfff0dc,environment:.86,normal:2.4,fog:.0046,wear:{macro:.26,base:0,height:1.3,grime:.32,streak:.2,floor:.18,edge:.7},sky:SKIES.caldera,reflections:{paving:.5,quay:.45,deck:.5}},
 forge:{hemi:.48,bounce:[0xe0edf2,0xb8b2a6],ambient:1,sun:1.32,sunColor:0xfff2e2,sunPosition:[-23.4,23.2,3],environment:1.12,normal:2.6,fog:.005,wear:{macro:.22,base:0,height:1.1,grime:.3,streak:.18,floor:.16,edge:.85},sky:SKIES.forge,reflections:{floor:.3},motes:{count:500,color:0xd8dcd8,opacity:.18,size:.01},lamps:[[-17,2.9,0,5],[17,2.9,0,5]]},
 sahra:{hemi:.72,wear:{macro:.32,base:0,height:1.2,grime:.28,streak:.14,floor:.14,edge:0},bounce:[0xd8d6cc,0xd2aa78],ambient:1,sun:1.36,sunColor:0xffe2bd,sunPosition:[-82,64,-60],shadowBox:{left:-62,right:58,top:37,bottom:-34,near:1,far:260},environment:1.1,normal:2.7,fog:.0044,sky:SKIES.sahra,reflections:{tunnelFloor:.22,floor:.4,road:.45,paving:.5,sitePaving:.45},motes:{count:1100,color:0xe2cfaa,opacity:.26,size:.011},lamps:[[-40,3.9,14,26],[-40,3.9,1,26],[-40,3.9,-9,26],[-46,3.9,-21,26],[-20,3.45,-9,20]]}

};
// V44 weathering pass, visual only: macro variation breaks texture tiling, walls gain
// grime at their base and rain streaks, floors dirt patches, and painted boxes worn,
// chipped edges and panel seams (from face UVs, measured in metres via derivatives).
const WEAR_NOISE=`varying vec3 vG44W;varying vec3 vG44N;vec3 g44Bevel=vec3(0.);
float g44Hash(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
float g44Noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(g44Hash(i),g44Hash(i+vec2(1,0)),u.x),mix(g44Hash(i+vec2(0,1)),g44Hash(i+vec2(1,1)),u.x),u.y);}
`;
function worldWear(material,w){
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey?.()||'';// V44b: edges come from the face itself. Untextured boxes use their 0..1 face UVs; textured walls only
 // where metricBlock's face-metre 'wear' attribute survives (userData.faceWear). Tiled UVs never mark
 // edges any more: their fract() put a pale rim at every texture repeat across the wall.
 const face=!material.map?false:!!material.userData.faceWear,bevel=!liteWorld()&&(!material.map||face),edge=(w.edge||bevel)&&!material.map?.isCanvasTexture&&(!material.map||face);
 if(edge&&!face)material.defines={...material.defines,USE_UV:''};
 const f=v=>(+v).toFixed(3);
 material.onBeforeCompile=function(shader,renderer){
  previous?.call(this,shader,renderer);
  shader.vertexShader=(face&&edge?(shader.vertexShader.includes('attribute vec4 wear')?'':'attribute vec4 wear;')+'varying vec4 vG44F;':'')+'varying vec3 vG44W;varying vec3 vG44N;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvG44W=(modelMatrix*vec4(transformed,1.0)).xyz;vG44N=normalize(mat3(modelMatrix)*objectNormal);'+(face&&edge?'vG44F=wear;':''));
  shader.fragmentShader=(face&&edge?'varying vec4 vG44F;':'')+WEAR_NOISE+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
{vec3 wn=normalize(vG44N);vec3 an=abs(wn);bool wflat=an.y>.6;vec2 wp=wflat?vG44W.xz:(an.x>an.z?vG44W.zy:vG44W.xy);
float m1=g44Noise(wp*.11),m2=g44Noise(wp*.43+7.1),m3=g44Noise(wp*1.7+3.3);float macro=m1*.6+m2*.4;
diffuseColor.rgb*=1.+(macro-.5)*${f(w.macro)};float grain=g44Noise(wp*11.3)*.6+g44Noise(wp*31.7)*.4;diffuseColor.rgb*=1.+(grain-.5)*.12*(1.-smoothstep(3.,15.,length(vViewPosition)));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.05,1.,.9),smoothstep(.6,.9,m2)*.45);
if(!wflat){float h=vG44W.y-${f(w.base)};float base=(1.-smoothstep(0.,${f(w.height)},h))*(.5+.5*m3);
 float streak=smoothstep(.58,.96,g44Noise(vec2(wp.x*3.7,wp.y*.085)))*(.35+.65*m1);
 diffuseColor.rgb*=1.-${f(w.grime)}*base-${f(w.streak)}*streak;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.9,.86,.78),base*.35);}
else if(wn.y>0.){float dirt=smoothstep(.5,.8,m1*.65+m3*.35);diffuseColor.rgb*=1.-${f(w.floor)}*dirt;}
${edge?`{vec3 dpx=dFdx(vG44W),dpy=dFdy(vG44W);${face?'vec2 g44S=vG44F.xy;':'vec2 g44S=vUv;'}vec2 dux=dFdx(g44S),duy=dFdy(g44S);float det=dux.x*duy.y-dux.y*duy.x;
 if(abs(det)>1e-10${face?'&&vG44F.z>0.':''}){vec3 dpu=(dpx*duy.y-dpy*dux.y)/det,dpv=(dpy*dux.x-dpx*duy.x)/det;${face?'vec2 fu=vG44F.xy/max(vG44F.zw,vec2(1e-3));vec2 e=min(vG44F.xy,vG44F.zw-vG44F.xy);':'vec2 fu=fract(vUv+1e-4);vec2 e=min(fu,1.-fu)*vec2(length(dpu),length(dpv));'}
  float d=min(e.x,e.y),near=1.-smoothstep(4.,22.,length(vViewPosition));
  float rim=(1.-smoothstep(.012,.05,d))*near,chip=(1.-smoothstep(.02,.11,d))*smoothstep(.42,.7,g44Noise(wp*7.3+m3))*near;float seam=(1.-smoothstep(.0,.012,d))*near;
  ${bevel?`if(length(fwidth(vG44N))<1e-3){vec2 kb=(1.-smoothstep(vec2(0.),vec2(.032),e))*(1.-smoothstep(6.,26.,length(vViewPosition)));g44Bevel=normalize(dpu)*(fu.x<.5?-1.:1.)*kb.x+normalize(dpv)*(fu.y<.5?-1.:1.)*kb.y;}`:''}
  float lum=dot(diffuseColor.rgb,vec3(.299,.587,.114));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(lum)*1.25+.035,chip*${f(w.edge)});
  diffuseColor.rgb*=1.+rim*${f(w.edge*.35)}-seam*${f(w.edge*.5)};}}`:''}}`).replace('#include <normal_fragment_maps>',bevel?'#include <normal_fragment_maps>\nnormal=normalize(normal+(viewMatrix*vec4(g44Bevel,0.)).xyz*1.1);':'#include <normal_fragment_maps>');
 };
 material.customProgramCacheKey=()=>previousKey+`-wear44b-${JSON.stringify(w)}-${edge}-${bevel}-${face}`;material.needsUpdate=true;
}
const linear=c=>new THREE.Color().setRGB(c[0],c[1],c[2]);
export function realizeWorld(scene,mapId,{lamps=true}={}){
 const profile=PROFILES[mapId];if(!profile||scene.userData.realized)return;scene.userData.realized=true;
 let sun=null;
 scene.traverse(o=>{
  if(o.isHemisphereLight){o.intensity*=profile.hemi;if(profile.bounce){o.color.set(profile.bounce[0]);o.groundColor.set(profile.bounce[1]);}}
  else if(o.isAmbientLight)o.intensity*=profile.ambient;
  else if(o.isDirectionalLight&&o.castShadow){sun=o;o.intensity*=profile.sun;o.color.set(profile.sunColor);o.shadow.normalBias=Math.min(o.shadow.normalBias,.022);
   // A lower sun rakes the facades; the shadow box widens to keep the whole arena covered.
   if(profile.sunPosition){o.position.fromArray(profile.sunPosition);if(profile.shadowBox)Object.assign(o.shadow.camera,profile.shadowBox);}o.shadow.camera.updateProjectionMatrix();}
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
   if(profile.wear&&!m.transparent&&!glowing&&m.roughness>.25&&!m.map?.isCanvasTexture)worldWear(m,profile.wear);
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
