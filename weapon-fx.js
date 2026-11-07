// V42 "prime" light on the weapons' own surfaces. The OB-510 AVERLA's colours are baked into its model; the other classes
// keep their finish (factory or the player's paint) and the light is added on top of it, so a paint job is never lost.
// A mask on each model's own UVs carries the lines (R), the distance from the chamber along the weapon (G, the
// direction the light flows), the gold signature marks (B, the same gold on every class: one family) and the worn
// edges (A, metal showing through on chamfers and corners). Each class has its own accent colour, flow and pattern.
// Two tiers share one set of uniforms per class: the view tier (first person, Officina) breathes, flows and sends a
// wave from the chamber on every shot and through the inspection; the world tier (other players, drops, bodies) is a
// dim static glow under the bloom threshold, so a weapon reads the same to everyone and gives no one a brighter target.
// Every class runs the same two programs (per-class looks are uniforms), so a new class or colour links nothing.
import * as T from './vendor/three.module.js';
const v3=a=>new T.Color(a[0],a[1],a[2]),v4=a=>new T.Vector4(a[0],a[1],a[2],a[3]);
const GOLD=[1,.72,.34],GOLD_HI=[1,.93,.78];
// flow (freq, speed, head rise, head fall) · idle (base, amp, speed, freq) · glyph (base, amp, speed, freq)
// head (gain, halo, halo on head, wave sharpness) · wave (line, halo, glyph, wear sparkle) · dash (freq, duty, speed, -)
// world (line, glyph, wear, -) · wear (rough, bright, metal, -). Wave speed is per class (wave[4]).
// sdf: the mask's B channel is a distance field of the gold marks (V42 review: coverage showed the texel staircase on
// the letters up close), cut at .5 in the shader with a screen-space edge, so they stay sharp at any distance.
export const LOOKS={
 // OB-110 SMERIGLIO: ember red, a quick heartbeat that runs the slide's twin rails.
 0:{mask:'./assets/models/v42/smeriglio-fx.webp',sdf:1,line:[1,.2,.12],lineHi:[1,.62,.42],flow:[1.7,.62,.03,.2],idle:[.26,.06,2.6,11],inlay:[.8,.5,.9,.8],glyph:[.3,.12,2.2,30],head:[1.6,.03,.12,8],wave:[1.6,.45,.45,.25],waveSpeed:1.7,dash:[0,1,0,0],world:[.045,.13,1,0],wear:[.5,.22,.25,0],inspect:[.22,.5],parts:[[/gun_atlas/,[1,1,0,0]]]},
 // OB-210 ASSILLO: acid teal in short dashes that stream fast along the receiver, like a signal on a wire.
 1:{mask:'./assets/models/v42/assillo-fx.webp',sdf:1,line:[.1,1,.78],lineHi:[.66,1,.92],flow:[2.2,.5,.03,.24],idle:[.22,.05,1.9,10],inlay:[.8,.45,.9,.8],glyph:[.3,.12,2.2,30],head:[1.5,.025,.12,7],wave:[1.5,.45,.45,.25],waveSpeed:1.6,gap:.4,dash:[46,.55,1.1,0],world:[.04,.13,1,0],wear:[.5,.2,.2,0],inspect:[.22,.5],parts:[[/^Maglow/,[.5,1,.5,0]],[/^material/,[.5,1,0,0]]]},
 // OB-310 RONCOLA: emerald inlay, one long slow pull from the chamber to the muzzle; the wood keeps its grain.
 2:{mask:'./assets/models/v42/roncola-fx.webp',sdf:1,line:[.18,1,.42],lineHi:[.7,1,.78],flow:[1.4,.24,.05,.38],idle:[.24,.05,1.3,7],inlay:[.8,.45,.9,.8],glyph:[.3,.12,2.2,30],head:[1.4,.03,.14,6],wave:[1.6,.5,.45,.25],waveSpeed:1.1,gap:.35,dash:[0,1,0,0],world:[.045,.13,1,0],wear:[.45,.2,.2,0],inspect:[.22,.5],parts:[[/WornBoltSteel|BluedReceiver|LaminatedWood/,[1,1,0,0],1],[/PhosphateSteel/,[1,1,0,0],1,/WeaponBody/]]},
 // OB-320 TARLO: amethyst, segments that light one after another down the rail.
 3:{mask:'./assets/models/v42/tarlo-fx.webp',sdf:1,line:[.62,.3,1],lineHi:[.88,.76,1],flow:[2.6,.42,.02,.16],idle:[.26,.05,1.7,9],inlay:[.8,.5,.9,.8],glyph:[.3,.12,2.2,30],head:[1.6,.03,.12,7],wave:[1.6,.45,.45,.25],waveSpeed:1.3,gap:.35,dash:[18,.72,.42,0],world:[.042,.13,1,0],wear:[.5,.2,.2,0],inspect:[.22,.5],parts:[[/M_tarlo/,[1/3,1,0,0]]]},
 // OB-510 AVERLA: obsidian and gold, the reference look (V42 review values, unchanged).
 4:{mask:'./assets/models/v42/eclisse-fx.webp',line:GOLD,lineHi:GOLD_HI,glyphLo:GOLD,glyphHi:GOLD_HI,flow:[2.4,.36,.04,.3],idle:[.11,.03,1.6,9],glyph:[.34,.16,2.2,30],head:[1.5,.025,.14,7],wave:[1.7,.5,.45,0],waveSpeed:1.25,dash:[0,1,0,0],world:[.042,.15,0,0],wear:[0,0,0,0],inspect:[.28,.87]},
 // K-07: ice blue, a glint that runs the cutting edge from the guard to the point.
 5:{mask:'./assets/models/v42/k07-fx.webp',sdf:1,line:[.3,.66,1],lineHi:[.82,.93,1],flow:[1.6,.55,.03,.18],idle:[.22,.05,1.5,8],inlay:[.7,.5,.9,.8],glyph:[.3,.12,2.2,30],head:[1.7,.03,.14,6],wave:[1.5,.45,.45,.25],waveSpeed:1.5,dash:[0,1,0,0],world:[.04,.13,1,0],wear:[.4,.25,.2,0],inspect:[.2,.5],parts:[[/^k07/,[1,1,0,0]]]},
 // V42 b3: the Officina designs and the AVERLA CLASSICO, each with its own mask on its own UVs and its own accent. `cls` is
 // the class whose shots and inspection beats send the wave; their masks load only when the design is first worn.
 // OB-220 TAFANO: electric sky blue, quick short heads that buzz along the receiver, the skeleton stock and the magazine.
 tafano:{cls:1,mask:'./assets/models/v42/tafano-fx.webp',sdf:1,line:[0,.72,1],lineHi:[.6,.92,1],flow:[3,.78,.025,.14],idle:[.24,.06,4.2,14],inlay:[.8,.5,.9,.8],glyph:[.3,.12,2.2,30],head:[1.5,.025,.12,7],wave:[1.5,.45,.45,.25],waveSpeed:1.7,gap:.4,dash:[0,1,0,0],world:[.042,.13,1,0],wear:[.5,.2,.2,0],parts:[[/^tafano_2$/,[.5,1,0,0]],[/^tafano_1$/,[.5,1,.5,0]]]},
 // OB-315 MAGLIO: indigo blue, one heavy slow swell from the chamber; the handguard's slots, the top rail and the magazine's
 // ribs carry it. Deep and held under the tone mapper's white (V42 b3 review: the paler indigo read as white glints).
 maglio:{cls:2,mask:'./assets/models/v42/maglio-fx.webp',sdf:1,line:[.2,.26,1],lineHi:[.5,.56,1],flow:[1.15,.2,.06,.42],idle:[.22,.06,1,6],inlay:[.8,.45,.9,.8],glyph:[.3,.12,2.2,30],head:[1.2,.03,.1,6],wave:[1.3,.4,.45,.25],waveSpeed:1,gap:.35,dash:[0,1,0,0],world:[.045,.13,1,0],wear:[.5,.2,.2,0],parts:[[/^Material\.001$/,[1,1,0,0]]]},
 // OB-510 AVERLA CLASSICO: platinum silver (the one light with no hue, so no class shares it), sober lines along the fore-end
 // and the comb, rings at the muzzle and the scope's bells (the rig's second UV set).
 classico:{cls:4,mask:'./assets/models/v42/classico-fx.webp',sdf:1,line:[.9,.92,1],lineHi:[1,1,1],flow:[2,.3,.04,.26],idle:[.4,.08,1.4,8],inlay:[.8,.62,.9,.8],glyph:[.3,.12,2.2,30],head:[1.5,.06,.18,7],wave:[1.6,.5,.45,.25],waveSpeed:1.25,dash:[0,1,0,0],world:[.04,.13,1,0],wear:[.45,.2,.2,0],parts:[[/^(Body|Body_2|Gun_Metal|Metal_Stratched|Scope)$/,[1,1,0,0],1]]},
 // V42 b4a, the designs that are weapons of their own (Blender-built, one atlas per model: every material but the wood
 // and the optic's glass takes the whole mask).
 // OB-120 ZANZARA (V44 redesign): ultraviolet orchid, a wingbeat: short dashes that shiver fast along the chamfers, the vent rib and
 // the windows over the gold barrel, and a quick flicker under them; gold filets on the chamfers and the compensator's lips.
 zanzara:{cls:0,mask:'./assets/models/v42/zanzara-fx.webp',sdf:1,line:[.74,.14,1],lineHi:[.96,.78,1],flow:[2.6,1.25,.02,.1],idle:[.26,.07,9,22],inlay:[.8,.5,.9,.8],glyph:[.32,.12,2.2,30],head:[1.6,.025,.12,7],wave:[1.6,.45,.45,.25],waveSpeed:1.9,gap:.3,dash:[34,.46,3.2,0],world:[.042,.13,1,0],wear:[.5,.2,.2,0],parts:[[/^zanzara_/,[1,1,0,0]]]},
 // OB-130 CINGHIALE: molten amber, one slow heavy swell down the slide's inlay, the underlug and the vented rib.
 cinghiale:{cls:0,mask:'./assets/models/v42/cinghiale-fx.webp',sdf:1,line:[1,.65,0],lineHi:[1,.88,.5],flow:[1.1,.22,.06,.45],idle:[.24,.05,1.1,6],inlay:[.8,.5,.9,.8],glyph:[.3,.12,2.2,30],head:[1.4,.03,.14,6],wave:[1.7,.55,.45,.25],waveSpeed:1,gap:.35,dash:[0,1,0,0],world:[.045,.13,1,0],wear:[.5,.2,.2,0],parts:[[/^cinghiale_(?!wood)/,[1,1,0,0]]]},
 // OB-230 CICALA: acid green in rapid chirps along the receiver's channel, the magazine and the stock's butt.
 cicala:{cls:1,mask:'./assets/models/v42/cicala-fx.webp',sdf:1,line:[.05,1,0],lineHi:[.7,1,.6],flow:[2.8,.7,.025,.14],idle:[.24,.06,3.6,12],inlay:[.8,.5,.9,.8],glyph:[.3,.12,2.2,30],head:[1.5,.025,.12,7],wave:[1.5,.45,.45,.25],waveSpeed:1.7,gap:.4,dash:[40,.5,1.3,0],world:[.042,.13,1,0],wear:[.5,.2,.2,0],parts:[[/^cicala_/,[1,1,0,0]]]},
 // V42 b4b. OB-330 SCURE: ruby red, a heavy pulse that walks the handguard's inserts, the receiver's seam and the stock's comb.
 scure:{cls:3,mask:'./assets/models/v42/scure-fx.webp',sdf:1,line:[1,0,.16],lineHi:[1,.6,.62],flow:[1.3,.26,.05,.4],idle:[.24,.05,1.2,7],inlay:[.8,.5,.9,.8],glyph:[.3,.12,2.2,30],head:[1.4,.03,.12,6],wave:[1.6,.5,.45,.25],waveSpeed:1.15,gap:.35,dash:[0,1,0,0],world:[.042,.13,1,0],wear:[.5,.2,.2,0],parts:[[/^scure_(?!lens)/,[1,1,0,0]]]},
 // OB-520 GHEPPIO: cobalt blue in long segments that run from the chamber to the suppressor, quick like the kestrel's dive.
 gheppio:{cls:4,mask:'./assets/models/v42/gheppio-fx.webp',sdf:1,line:[0,.1,1],lineHi:[.55,.66,1],flow:[2.2,.5,.03,.2],idle:[.24,.05,1.8,9],inlay:[.8,.5,.9,.8],glyph:[.3,.12,2.2,30],head:[1.5,.03,.12,7],wave:[1.6,.45,.45,.25],waveSpeed:1.5,gap:.35,dash:[16,.7,.5,0],world:[.042,.13,1,0],wear:[.5,.2,.2,0],parts:[[/^gheppio_(?!lens)/,[1,1,0,0]]]},
 // ARTIGLIO: magenta, a glint that rides the claw's curved edge to its point and rings the finger loop.
 artiglio:{cls:5,mask:'./assets/models/v42/artiglio-fx.webp',sdf:1,line:[1,.24,.62],lineHi:[1,.72,.9],flow:[1.5,.5,.03,.18],idle:[.22,.05,1.5,8],inlay:[.7,.5,.9,.8],glyph:[.3,.12,2.2,30],head:[1.7,.03,.14,6],wave:[1.5,.45,.45,.25],waveSpeed:1.5,dash:[0,1,0,0],world:[.04,.13,1,0],wear:[.4,.25,.2,0],parts:[[/^karambit$/,[1,1,0,0]]]},
 // FARFALLA: chartreuse, segments that open along both handles and run the blade's edge.
 farfalla:{cls:5,mask:'./assets/models/v42/farfalla-fx.webp',sdf:1,line:[.6,1,.2],lineHi:[.9,1,.72],flow:[1.8,.6,.03,.18],idle:[.22,.05,1.6,8],inlay:[.7,.5,.9,.8],glyph:[.3,.12,2.2,30],head:[1.7,.03,.14,6],wave:[1.5,.45,.45,.25],waveSpeed:1.5,dash:[22,.62,.7,0],world:[.04,.13,1,0],wear:[.4,.25,.2,0],parts:[[/^03___Default$/,[.5/.93,1/.76,0,0]],[/^07___Default$/,[.5,1,.5,0]]]},
 // BOWIE OB: deep orange copper, a slow glow along the clip point and the fuller, gold on the guard.
 bowie:{cls:5,mask:'./assets/models/v42/bowie-fx.webp',sdf:1,line:[1,.3,.02],lineHi:[1,.66,.38],flow:[1.3,.42,.04,.22],idle:[.22,.05,1.3,7],inlay:[.7,.5,.9,.8],glyph:[.3,.12,2.2,30],head:[1.6,.03,.14,6],wave:[1.5,.45,.45,.25],waveSpeed:1.4,dash:[0,1,0,0],world:[.04,.13,1,0],wear:[.4,.25,.2,0],parts:[[/^Material_102$/,[1,1,0,0]]]}
};
const time={value:2.3};
// V42 b3b: the same clock drives the Officina kits' light (weapon-kits.js).
export const fxTime=time;
const looks=new Map(),lookList=[];
// Looks are keyed by class number or design id (stored as text, so 4 and '4' are one look).
function look(index){
 const k=String(index);if(looks.has(k))return looks.get(k);const L=LOOKS[k];if(!L)return null;
 const u={uFxTime:time,uFxWave:{value:-1},uFxMask:{value:null},uFxA:{value:v3(L.line)},uFxB:{value:v3(L.lineHi)},uFxC:{value:v3(L.glyphLo||GOLD)},uFxE:{value:v3(L.glyphHi||GOLD_HI)},
  uFxF:{value:v4(L.flow)},uFxI:{value:v4(L.idle)},uFxG:{value:v4(L.glyph)},uFxH:{value:v4(L.head)},uFxW:{value:v4(L.wave)},uFxD:{value:v4(L.dash)},uFxO:{value:v4(L.world)},uFxX:{value:v4(L.wear)},uFxK:{value:v4(L.inlay||[0,0,0,0])},uFxQ:{value:new T.Vector4(L.sdf?1:0,0,0,0)}};
 const entry={index:L.cls===undefined?+k:k,cls:L.cls??+k,L,u,mask:null};looks.set(k,entry);lookList.push(entry);return entry;
}
const DECL='uniform sampler2D uFxMask;uniform float uFxTime,uFxWave;uniform vec3 uFxA,uFxB,uFxC,uFxE;uniform vec4 uFxF,uFxI,uFxG,uFxH,uFxW,uFxD,uFxO,uFxX,uFxK,uFxQ;varying vec2 vFxUv;\n'+
 'float fxGold(float b){float w=clamp(fwidth(b)*.75,1e-4,.35);return uFxQ.x<.5?b:smoothstep(.5-w,.5+w,b);}\n';
// The skin itself, in both tiers and on any finish: the lines are inlaid metal in the class colour, the marks are gold
// leaf, worn edges show bright steel; all smoother and more metallic than the finish round them. The light comes on top.
const SKIN=`{vec4 fxS=texture2D(uFxMask,vFxUv);fxS.b=fxGold(fxS.b);diffuseColor.rgb=mix(diffuseColor.rgb,max(diffuseColor.rgb,vec3(.42,.43,.44))*1.15,uFxX.y*fxS.a);
diffuseColor.rgb=mix(diffuseColor.rgb,uFxA*uFxK.y,fxS.r*uFxK.x);diffuseColor.rgb=mix(diffuseColor.rgb,uFxC*uFxK.w,fxS.b*uFxK.z);}`;
const WEAR=`{vec4 fxS=texture2D(uFxMask,vFxUv);fxS.b=fxGold(fxS.b);float fxInlay=max(fxS.r*uFxK.x,fxS.b*uFxK.z);roughnessFactor=mix(clamp(roughnessFactor*(1.-uFxX.x*fxS.a),.04,1.),.3,fxInlay);metalnessFactor=mix(mix(metalnessFactor,1.,uFxX.z*fxS.a),.92,fxInlay);}`;
const VIEW=`{vec4 fxM=texture2D(uFxMask,vFxUv);fxM.b=fxGold(fxM.b);float fxHalo=texture2D(uFxMask,vFxUv,3.5).r;float fxD=fxM.g;
float fxFlow=fract(fxD*uFxF.x-uFxTime*uFxF.y),fxHead=smoothstep(0.,uFxF.z,fxFlow)*(1.-smoothstep(uFxF.z,uFxF.w,fxFlow));
float fxDash=uFxD.y>=1.?1.:.25+.75*smoothstep(uFxD.y+.06,uFxD.y-.06,fract(fxD*uFxD.x-uFxTime*uFxD.z));
float fxIdle=uFxI.x+uFxI.y*sin(uFxTime*uFxI.z+fxD*uFxI.w),fxWave=exp(-pow((fxD-uFxWave)*uFxH.w,2.))*step(0.,uFxWave);
float fxL=fxM.r*fxDash*(fxIdle+fxHead*uFxH.x)+fxHalo*fxDash*(uFxH.y+fxHead*uFxH.z),fxG=fxM.b*(uFxG.x+uFxG.y*sin(uFxTime*uFxG.z+fxD*uFxG.w));
totalEmissiveRadiance+=mix(uFxA,uFxB,fxHead)*fxL+mix(uFxC,uFxE,fxHead)*fxG+(uFxA*(fxM.r*uFxW.x+fxHalo*uFxW.y)+uFxC*fxM.b*uFxW.z+uFxE*fxM.a*uFxW.w)*fxWave;}`;
const WORLD=`{vec4 fxM=texture2D(uFxMask,vFxUv);fxM.b=fxGold(fxM.b);totalEmissiveRadiance+=uFxA*fxM.r*uFxO.x+uFxC*fxM.b*uFxO.y;}`;
// `rect` maps the model's UV (or second UV) into its part of the class mask (scale xy, offset zw).
// A finish with the prime look off (or a design whose mask is still loading) reads a black mask: every term above scales with
// the mask, so the material is the original.
const BLACK=new T.DataTexture(new Uint8Array(4),1,1);BLACK.needsUpdate=true;
// V42: light colourways chosen in Officina, per player: [lines, flow head, marks, mark glow]. ORO keeps each weapon's own colours.
export const GLOWS={oro:{label:'Oro · di serie'},zenit:{label:'Zenit · bianco ghiaccio',c:[[.55,.8,1],[.92,.97,1],[.82,.9,1],[1,1,1]]},brace:{label:'Brace · rosso fuoco',c:[[1,.34,.12],[1,.76,.42],[1,.56,.26],[1,.86,.62]]},aurora:{label:'Aurora · verde e viola',c:[[.32,1,.68],[.82,.6,1],[.6,1,.85],[.9,.8,1]]}};
export function setFxGlow(root,glow){const c=GLOWS[glow]?.c||null;root?.traverse(o=>{if(!o.isMesh)return;for(const m of [].concat(o.material))if(m?.userData?.fx)m.userData.fxGlow=c?c.map(v=>new T.Color(...v)):null;});}
export function setFxEnabled(root,on){root?.traverse(o=>{if(!o.isMesh)return;for(const m of [].concat(o.material)){if(m?.userData?.fx)m.userData.fxOff=!on;const look=m?.userData?.finishProtected&&(on?m.userData.primeLook:m.userData.classic);if(look){m.color.setHex(look[0]);m.metalness=look[1];m.roughness=look[2];}}});}
function hook(m,entry,world,rect,uv1){
 const u=entry.u,R={value:new T.Vector4(...rect)},mask={get value(){return m.userData.fxOff||!u.uFxMask.value?BLACK:u.uFxMask.value;}},tint=(k,i)=>({get value(){return m.userData.fxGlow?.[i]||u[k].value;}});m.userData.weaponFx=world?'world':'view';m.userData.fx={index:entry.index,world,rect:[...rect],uv1};
 m.onBeforeCompile=s=>{for(const k in u)s.uniforms[k]=u[k];s.uniforms.uFxMask=mask;s.uniforms.uFxA=tint('uFxA',0);s.uniforms.uFxB=tint('uFxB',1);s.uniforms.uFxC=tint('uFxC',2);s.uniforms.uFxE=tint('uFxE',3);s.uniforms.uFxR=R;
  // The second UV set is declared by three only while a map samples it (the RONCOLA's AO): declare it here too, so the
  // light still compiles if an asset change drops that map.
  s.vertexShader='uniform vec4 uFxR;varying vec2 vFxUv;\n'+(uv1?'#ifndef USE_UV1\nattribute vec2 uv1;\n#endif\n':'')+s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvFxUv='+(uv1?'uv1':'uv')+'*uFxR.xy+uFxR.zw;');
  s.fragmentShader=DECL+s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+SKIN).replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\n'+WEAR).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n'+(world?WORLD:VIEW));};
 // The finish (weapon-finish.js) chains on top of this hook and adds userData.weaponFx to its own key.
 const key=(world?'ob-fx-world-2':'ob-fx-view-2')+(uv1?'-uv1':'');m.customProgramCacheKey=()=>key;m.userData.fxKey=key;m.needsUpdate=true;return m;
}
// One mask per class, loaded once; every tier of that class samples it.
// `upload` (set by the game) sends a mask that arrives after start-up to the GPU at once, not in the first frame that draws it.
let upload=null;export function onFxMask(fn){upload=fn;}
export function loadFxMask(index){
 const entry=look(index);if(!entry||typeof document==='undefined')return Promise.resolve(null);
 // V43 b56: decoded off the main thread (an <img> was decoded inside its upload or its bitmap: 12-24 ms in one frame).
 // Same browsers as the GLTF loader's bitmaps (Safari 17+, Firefox 98+); any failure falls back to the <img> path.
 const ua=globalThis.navigator?.userAgent||'',safari=/^((?!chrome|android).)*safari/i.test(ua)?+(ua.match(/Version\/(\d+)/)?.[1]||0):99,firefox=/Firefox\/(\d+)/.exec(ua)?.[1]??999;
 const plain=()=>new T.TextureLoader().loadAsync(entry.L.mask),bitmap=typeof createImageBitmap==='function'&&typeof fetch==='function'&&safari>=17&&+firefox>=98;
 return entry.mask??=(bitmap?new T.ImageBitmapLoader().setOptions({imageOrientation:'none',premultiplyAlpha:'none',colorSpaceConversion:'none'}).loadAsync(entry.L.mask).then(b=>new T.Texture(b),plain):plain()).then(t=>{t.flipY=false;t.colorSpace=T.NoColorSpace;t.anisotropy=8;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.needsUpdate=true;
  // (b56 rev) The game may send it up a band a frame (it has alpha, so no canvas copy): the shaders get it once complete.
  return Promise.resolve().then(()=>upload?.(t)).catch(()=>{}).then(()=>{entry.u.uFxMask.value=t;return t;});}).catch(e=>{console.error('Maschera FX non caricata',entry.L.mask,e);return null;});
}
// Start-up loads the six classes; a design's mask (`cls`) waits until the design is first worn.
export const loadFxMasks=()=>Promise.all(Object.keys(LOOKS).filter(k=>LOOKS[k].cls===undefined).map(i=>loadFxMask(+i)));
// A design GLB: its own material is the view tier and `dressFx` returns the dim clone for the arena. The AVERLA's one
// material takes the whole mask (and keeps its factory colours); the Officina designs list their materials in `parts`
// ([material name, rect, 1 = second UV set]) and keep the player's finish; a material not listed carries no light.
export function dressFx(material,index=4){if(!material||material.userData.weaponFx)return null;const entry=look(index);if(!entry)return null;
 const p=entry.L.parts?entry.L.parts.find(([mat])=>mat.test(material.name||'')):[null,[1,1,0,0],0];if(!p)return null;
 const world=hook(material.clone(),entry,true,p[1],!!p[2]);world.name=(material.name||'fx')+' / world';hook(material,entry,false,p[1],!!p[2]);if(!entry.L.parts)material.userData.finishProtected=world.userData.finishProtected=true;return world;}
// Base rigs: their materials are already cloned per rig, so they are hooked in place. A class's `parts` list the
// materials that carry light: [material name, rect of its part of the mask, 1 = second UV set, mesh name] (first match wins).
export function dressRig(root,index,world){const entry=look(index);if(!entry||!root||!entry.L.parts)return;if(entry.L.cls===undefined)loadFxMask(index);const done=new Map();
 root.traverse(o=>{if(!o.isMesh||o.userData.variantPart||o.userData.variantMark)return;o.material=Array.isArray(o.material)?o.material.map(m=>dress(o,m)):dress(o,o.material);});
 function dress(o,m){if(!m?.isMeshStandardMaterial)return m;const i=entry.L.parts.findIndex(([mat,,,mesh])=>mat.test(m.name)&&(!mesh||mesh.test(o.name)));if(i<0)return m;
  // A material shared by meshes of two parts gets one copy per part.
  const key=m.uuid+'|'+i;if(done.has(key))return done.get(key);const p=entry.L.parts[i],target=m.userData.weaponFx?m.clone():m;hook(target,entry,world,p[1],!!p[2]);done.set(key,target);return target;}}
// A copy of a lit material (clone() drops the hook): the same light on the copy.
// The copy shares the colourway (userData goes through JSON in clone(), which turns the colours into numbers).
export function cloneFx(m){const c=m.clone(),f=m.userData.fx;if(f){hook(c,look(f.index),f.world,f.rect,f.uv1);c.userData.fxGlow=m.userData.fxGlow||null;c.userData.fxOff=!!m.userData.fxOff;}return c;}
export const fxTextures=()=>lookList.map(e=>e.u.uFxMask.value).filter(Boolean);
// One write per frame. Under reduced motion the light holds still and no wave runs.
let calm=false;try{calm=matchMedia('(prefers-reduced-motion:reduce)').matches;}catch{}
export function tickFx(seconds,dt){if(calm)return;time.value=seconds%3600;for(let i=0;i<lookList.length;i++){const e=lookList[i],w=e.u.uFxWave;if(w.value>=0){w.value+=dt*e.L.waveSpeed;if(w.value>1.4)w.value=-1;}}}
// A shot (or a beat of the inspection) sends a wave of light from the chamber along the weapon.
// Automatic fire restarts the wave only once the last one has travelled `gap`, so a burst beats instead of holding a glow.
// The class's designs share its wave: whichever design is held, the shot lights it.
export function pulseFx(index=4){if(calm)return;for(let i=0;i<lookList.length;i++){const e=lookList[i];if(e.cls!==index)continue;const w=e.u.uFxWave;if(w.value>=0&&w.value<(e.L.gap||0))continue;w.value=0;}}
// Inspection beats of a class (fractions of the inspection), when the wave runs again.
export const inspectBeats=index=>LOOKS[index]?.inspect||[];
