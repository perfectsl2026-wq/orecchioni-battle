import * as THREE from './vendor/three.module.js';
// World-space variation survives batching and does not change the collision map.
export function weatherMaterial(material,{floor=false,amount=.16}={}){
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vSurfaceWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSurfaceWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=`varying vec3 vSurfaceWorld;
float surfaceHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float surfaceNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(surfaceHash(i),surfaceHash(i+vec2(1,0)),f.x),mix(surfaceHash(i+vec2(0,1)),surfaceHash(i+vec2(1,1)),f.x),f.y);}
`+shader.fragmentShader;
  const detail=floor?`
float age=surfaceNoise(vSurfaceWorld.xz*.27)*.7+surfaceNoise(vSurfaceWorld.xz*1.7)*.3;
diffuseColor.rgb*=mix(vec3(1.0-${amount.toFixed(3)}),vec3(1.0),age);
`:`
vec2 wallPlane=vec2(vSurfaceWorld.x+vSurfaceWorld.z,vSurfaceWorld.y);
float macro=surfaceNoise(wallPlane*vec2(.41,.36));
float streak=surfaceNoise(wallPlane*vec2(3.9,.13));
float baseAge=(1.0-smoothstep(.06,1.7,vSurfaceWorld.y))*(.32+.68*streak);
diffuseColor.rgb*=1.0-${amount.toFixed(3)}*(macro*.45+baseAge);
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.83,.86,.79),baseAge*.22);
`;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+detail);
  // Dry ground: the scans' polished spots (cobbles down to 0.01) read as wet under the sun.
  if(floor)shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(roughnessFactor,.74);');
 };
 material.customProgramCacheKey=()=>`surface-v30-${floor}-${amount}`;return material;
}

// Compress photographed albedo variation in linear space, keeping the authored
// hue and normal detail. This prevents dark tile patches reading as combat cover.
// V28 keeps most of the photographed variation: AO and grading now provide the
// separation that the old flattening offered, without the chalky, washed-out look.
export const ALBEDO_REALISM=.62;
export function readableAlbedo(material,{contrast=.75,lift=.04}={}){
 contrast=1-(1-contrast)*(1-ALBEDO_REALISM);lift*=1-ALBEDO_REALISM;
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
   '#include <map_fragment>\ndiffuseColor.rgb=diffuseColor.rgb*'+contrast.toFixed(3)+'+vec3('+lift.toFixed(3)+');');
 };
 material.customProgramCacheKey=()=>previousKey+'-readability-'+contrast+'-'+lift;
 return material;
}

// V28 material micro-detail for untextured paint, plaster and metal. World-space
// value noise varies albedo and roughness and perturbs the shading normal, so flat
// colours read as real surfaces. Fine octaves fade with distance to avoid shimmer.
const REAL_NOISE=`varying vec3 vRealWorld;varying vec3 vRealNormal;
float rHash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float rNoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rHash(i),rHash(i+vec2(1,0)),u.x),mix(rHash(i+vec2(0,1)),rHash(i+vec2(1,1)),u.x),u.y);}
vec2 realPlane(vec3 w,vec3 n){vec3 a=abs(n);return a.y>max(a.x,a.z)?w.xz:a.x>a.z?w.zy:w.xy;}
float realField(vec2 p,float fine){return rNoise(p*.45)*.42+rNoise(p*1.9)*.3+(rNoise(p*7.3)*.18+rNoise(p*23.)*.1)*fine+(1.-fine)*.14;}
`;
export function surfaceRealism(material,{albedo=.16,bump=.012,roughness=.12,scale=1}={}){
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey?.()||'';
 material.onBeforeCompile=function(shader,renderer){
  previous?.call(this,shader,renderer);
  shader.vertexShader='varying vec3 vRealWorld;varying vec3 vRealNormal;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvRealWorld=(modelMatrix*vec4(transformed,1.0)).xyz;vRealNormal=normalize(mat3(modelMatrix)*objectNormal);');
  shader.fragmentShader=REAL_NOISE+shader.fragmentShader
   .replace('#include <map_fragment>',`#include <map_fragment>
vec2 realUV=realPlane(vRealWorld,vRealNormal)*${scale.toFixed(3)};float realFine=1.-smoothstep(6.,26.,length(vViewPosition));float realHeight=realField(realUV,realFine);
diffuseColor.rgb*=1.+(realHeight-.5)*${(albedo*2).toFixed(3)};diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.035,.995,.95),clamp((rNoise(realUV*.19)-.35)*.9,0.,1.));`)
   .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor=clamp(roughnessFactor+(realHeight-.5)*${(roughness*2).toFixed(3)},.04,1.);`)
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
{vec2 dh=vec2(dFdx(realHeight),dFdy(realHeight))*${bump.toFixed(4)};vec3 sp=-vViewPosition,sx=dFdx(sp),sy=dFdy(sp),r1=cross(sy,normal),r2=cross(normal,sx);float det=dot(sx,r1)*faceDirection;normal=normalize(abs(det)*normal-sign(det)*(dh.x*r1+dh.y*r2));}`);
 };
 material.customProgramCacheKey=()=>previousKey+'-real28-'+albedo+'-'+bump+'-'+roughness+'-'+scale;
 return material;
}

// V28.1 layered surfaces, after the Valve/Riot practice of tiling base materials
// plus a worn layer: render chips off at vertical edges, tops and a ragged base
// band, exposing the substrate. Masks come from metricBlock's face-local metres,
// so batching keeps them exact; meshes without the attribute show no wear.
const WEAR_NOISE=`float wHash(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
float wNoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(wHash(i),wHash(i+vec2(1,0)),u.x),mix(wHash(i+vec2(0,1)),wHash(i+vec2(1,1)),u.x),u.y);}
`;
export function layeredWear(material,layer,{edge=.45,base=.6,top=.25,scale=1,strength=1,tint=0xffffff}={}){
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey?.()||'',tintColor=new THREE.Color(tint);
 material.userData.layered=true;
 material.onBeforeCompile=function(shader,renderer){
  previous?.call(this,shader,renderer);
  Object.assign(shader.uniforms,{wearMap:{value:layer.map},wearNormal:{value:layer.normalMap},wearRough:{value:layer.roughnessMap},wearTint:{value:tintColor}});
  shader.vertexShader='attribute vec4 wear;varying vec4 vWear;varying vec3 vWearAxis;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWear=wear;vWearAxis=normalize(mat3(modelMatrix)*objectNormal);');
  const s=scale.toFixed(3);
  shader.fragmentShader='uniform sampler2D wearMap,wearNormal,wearRough;uniform vec3 wearTint;varying vec4 vWear;varying vec3 vWearAxis;\n'+WEAR_NOISE+shader.fragmentShader
   .replace('#include <map_fragment>',`#include <map_fragment>
float wearBlend=0.;vec2 wearUV=vMapUv*${s};
if(vWear.z>0.){
 float n=wNoise(wearUV*2.7)*.55+wNoise(wearUV*8.3)*.3+wNoise(wearUV*21.)*.15;
 bool upright=abs(vWearAxis.y)<.5;float side=min(vWear.x,vWear.z-vWear.x);
 float reach=${edge.toFixed(3)}*(.25+n*1.25);
 float m=1.-smoothstep(reach*.6,reach,side);
 if(upright){float b=${base.toFixed(3)}*(.2+n*1.3);m=max(m,1.-smoothstep(b*.7,b,vWear.y));float t=${top.toFixed(3)}*(.2+n*1.2);m=max(m,1.-smoothstep(t*.6,t,vWear.w-vWear.y));}
 else m=max(m,1.-smoothstep(reach*.5,reach,min(vWear.y,vWear.w-vWear.y)));
 m=clamp(m*${strength.toFixed(3)},0.,1.);wearBlend=smoothstep(.42,.58,m);
 vec4 wearTexel=texture2D(wearMap,wearUV);
 // A thin darker lip where the render breaks off reads as real thickness.
 float lip=smoothstep(.2,.42,m)*(1.-smoothstep(.42,.6,m));
 diffuseColor.rgb=mix(diffuseColor.rgb,wearTexel.rgb*wearTint,wearBlend)*(1.-lip*.32);
}`)
   .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor=mix(roughnessFactor,clamp(texture2D(wearRough,wearUV).g,.35,1.),wearBlend);`)
   .replace('#include <normal_fragment_maps>',`#ifdef USE_NORMALMAP_TANGENTSPACE
vec3 mapN=mix(texture2D(normalMap,vNormalMapUv).xyz,texture2D(wearNormal,wearUV).xyz,wearBlend)*2.-1.;mapN.xy*=normalScale*(1.+wearBlend*.6);normal=normalize(tbn*mapN);
#else
#include <normal_fragment_maps>
#endif`);
 };
 material.customProgramCacheKey=()=>previousKey+'-wear281-'+[edge,base,top,scale,strength,tint].join('-');
 return material;
}

// Wind-blown sand banked against walls and in corners (per-vertex 'drift' from
// decals.driftField): lighter, finer and flatter than the base ground material.
export function groundDrift(material,{color=0xc4a97f,strength=.72}={}){
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey?.()||'',sand=new THREE.Color(color);
 material.onBeforeCompile=function(shader,renderer){
  previous?.call(this,shader,renderer);shader.uniforms.driftColor={value:sand};
  shader.vertexShader='attribute float drift;varying float vDrift;varying vec3 vDriftWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDrift=drift;vDriftWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader='uniform vec3 driftColor;varying float vDrift;varying vec3 vDriftWorld;\n'+WEAR_NOISE+shader.fragmentShader
   // After every albedo grade injected behind map_fragment, so the sand colour is final.
   .replace('#include <color_fragment>',`float driftAmount=clamp(vDrift*${strength.toFixed(3)}*(.75+.5*wNoise(vDriftWorld.xz*1.7)),0.,1.);
diffuseColor.rgb=mix(diffuseColor.rgb,driftColor*(.9+.2*wNoise(vDriftWorld.xz*6.3)),smoothstep(.1,.75,driftAmount));
#include <color_fragment>`)
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.97,driftAmount);')
   .replace('#include <normal_fragment_maps>',`#ifdef USE_NORMALMAP_TANGENTSPACE
vec3 mapN=texture2D(normalMap,vNormalMapUv).xyz*2.-1.;mapN.xy*=normalScale*(1.-driftAmount*.85);normal=normalize(tbn*mapN);
#else
#include <normal_fragment_maps>
#endif`);
 };
 material.customProgramCacheKey=()=>previousKey+'-drift281-'+color+'-'+strength;
 return material;
}

// Re-grades a photographed albedo in linear space (saturation, gain) so CC0 scans
// share one art-directed palette, the way trim sheets are colour-matched per map.
export function toneAlbedo(material,{saturation=1,gain=1}={}){
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey?.()||'';
 material.onBeforeCompile=function(shader,renderer){
  previous?.call(this,shader,renderer);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
{float toneLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(vec3(toneLuma),diffuseColor.rgb,${saturation.toFixed(3)})*${gain.toFixed(3)};}`);
 };
 material.customProgramCacheKey=()=>previousKey+'-tone-'+saturation+'-'+gain;
 return material;
}
