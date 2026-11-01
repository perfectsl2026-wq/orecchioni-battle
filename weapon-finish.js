import {applyKit,KITS} from './weapon-kits.js?v=41.0';
import {applyVariant,variantFor,cleanBuild,VARIANTS} from './weapon-variants.js?v=41.0';
import * as T from './vendor/three.module.js';
export const PAINTS={graphite:{label:'Grafite',hex:'#45535d'},arctic:{label:'Gesso',hex:'#c9d1cf'},sand:{label:'Sabbia',hex:'#ba9e76'},naval:{label:'Blu acciaio',hex:'#41647c'},oxide:{label:'Ossido',hex:'#955449'},olive:{label:'Oliva',hex:'#727a56'}};
export const TRIMS={titanium:{label:'Titanio',hex:'#a2aeb0'},copper:{label:'Rame',hex:'#b8865b'},carbon:{label:'Carbonio',hex:'#29343c'}};
export const PATTERNS={solid:{label:'Uniforme',kills:0},duotone:{label:'Bicolore',kills:5},contour:{label:'Topografia',kills:15}};
const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():null;
// V33: `model` names an original design of the class (or 'stock' for the base model) and
// `build` its tuned parameters; with no index any catalogue id is accepted and the
// parameters are kept as given, so a loadout can be cleaned class by class.
export function cleanFinish(v,index){const model=typeof v?.model==='string'&&v.model!=='stock'&&(index===undefined?Object.values(VARIANTS).some(list=>list.some(x=>x.id===v.model)):!!variantFor(index,v.model))?v.model:'stock';
 return {model,build:model==='stock'?null:index===undefined?(v?.build&&typeof v.build==='object'?v.build:null):cleanBuild(index,model,v?.build),kit:Object.hasOwn(KITS,v?.kit)?v.kit:'service',surface:v?.surface==='satin'?'satin':'matte',customPrimary:hex(v?.customPrimary),customAccent:hex(v?.customAccent),style:v?.style==='paint'?'paint':'factory',primary:Object.hasOwn(PAINTS,v?.primary)?v.primary:'naval',accent:Object.hasOwn(TRIMS,v?.accent)?v.accent:'titanium',pattern:Object.hasOwn(PATTERNS,v?.pattern)?v.pattern:'solid'};}
export function cleanLoadout(v){return Array.from({length:6},(_,i)=>cleanFinish(Array.isArray(v)?v[i]:null,i));}
export const finishKey=v=>JSON.stringify(cleanFinish(v));
const originals=new WeakMap();
export function applyFinish(root,index,value){
 if(!root)return;const config=cleanFinish(value,index),key=finishKey(config);applyKit(root,index,config.kit);applyVariant(root,index,config);if(root.userData.finishKey===key)return;root.userData.finishKey=key;
 root.traverse(o=>{if(!o.isMesh||o.userData.finishSplit||!(/Magazine|ChargingHandle|RearIronSight/i.test(o.name)))return;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();for(const m of Array.isArray(o.material)?o.material:[o.material])m.userData.finishRole='accent';o.userData.finishSplit=true;});
 const materials=new Set();root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(!m||!m.isMeshStandardMaterial||materials.has(m)||m.name==='arms'||/glass|lens/i.test(m.name)||m.userData.finishProtected)continue;materials.add(m);
  if(!originals.has(m))originals.set(m,{color:m.color.clone(),roughness:m.roughness,metalness:m.metalness,compile:m.onBeforeCompile,cache:m.customProgramCacheKey});const original=originals.get(m);
  if(config.style==='factory'){m.color.copy(original.color);m.roughness=original.roughness;m.metalness=original.metalness;m.onBeforeCompile=original.compile;m.customProgramCacheKey=original.cache;m.needsUpdate=true;continue;}
  // V36: a paint job keeps the photographed material. Roughness and metalness maps stay in
  // place (the factory values are only biased by the surface choice) and the shader below
  // tints with the full contrast of the original albedo instead of flattening it.
  m.color.set(0xffffff);m.roughness=Math.min(1,original.roughness*(config.surface==='satin'?.72:1.02));m.metalness=config.surface==='satin'?Math.max(original.metalness,.3):original.metalness;
  const base=new T.Color(config.customPrimary||PAINTS[config.primary].hex),accent=new T.Color(config.customAccent||TRIMS[config.accent].hex),role=m.userData.finishRole==='accent'||/Scope|Screw|Gun_Metal|Metal_Stratched/.test(m.name);
  original.paintBase??=new T.Color();original.paintAccent??=new T.Color();original.paintBase.copy(role?accent:base);original.paintAccent.copy(accent);
  m.onBeforeCompile=shader=>{
   shader.uniforms.paintBase={value:original.paintBase};shader.uniforms.paintAccent={value:original.paintAccent};
   shader.vertexShader='varying vec3 vPaintPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPaintPosition=position;');
   shader.fragmentShader='varying vec3 vPaintPosition;uniform vec3 paintBase;uniform vec3 paintAccent;\n'+shader.fragmentShader;
   const pattern=config.pattern==='duotone'?'smoothstep(-.015,.015,vPaintPosition.z-vPaintPosition.y*.4)':config.pattern==='contour'?'1.0-smoothstep(.04,.04+max(fwidth(paintWave),.012),abs(paintWave))':'0.0';
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\nfloat paintShade=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)),0.0,1.0);float paintWave=sin(vPaintPosition.y*95.0+sin(vPaintPosition.z*28.0)*2.0);float paintMask=${pattern};vec3 paintColor=mix(paintBase,paintAccent,paintMask);float paintLum=dot(paintColor,vec3(.2126,.7152,.0722));\n// Tint around the paint's own brightness: dark grain, seams and shadows stay dark, worn edges and highlights stay bright.\nfloat paintDetail=paintShade/max(.08,paintLum);diffuseColor.rgb=paintColor*clamp(mix(.42,1.0,paintDetail)*(.72+.56*paintShade),.0,1.6)+vec3(max(0.0,paintShade-.72)*.5);`);
  };m.customProgramCacheKey=()=>`ob-finish-36-${config.pattern}-${role}`;m.needsUpdate=true;
 }});
}
