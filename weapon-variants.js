// V33 weapon variants. Every class keeps its base model and may gain variants: third-party
// models credited in assets/CREDITS.md, adapted here to the base model's frame. The grip sits
// where the shooting hand already is, the magazine hangs from the rig's Magazine node, the bolt
// rides the ChargingHandle node and the muzzle socket moves to the barrel length. Hands, reload
// and inspection therefore stay exactly as rehearsed. Each variant lists what the player can
// tune; the result is stored in the finish, so other players see it too. Stats never change
// here: the arbiter reads the class, not the model. Variants may carry a small engraved OB plate.
import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/addons/libs/meshopt_decoder.module.js';
import {WEAPONS} from './shared.js?v=42.0';
import {dressFx,loadFxMask,cloneFx} from './weapon-fx.js?v=42.0';
import {warmKitMaterials} from './weapon-kits.js?v=42.0';
import {DESIGN_STATS} from './weapon-stats.js?v=42.0';
const range=(key,label,def=.5)=>({key,label,type:'range',min:0,max:1,step:.05,def});
const choice=(key,label,options,def=0)=>({key,label,type:'choice',options,def});
const toggle=(key,label,parts)=>({key,label,type:'choice',options:['Montato','Rimosso'],def:0,hides:parts});
// Base frames (gun-local units, twice real size): shooting hand, support hand, magazine,
// bolt handle and muzzle positions read from the GLB rigs. Z runs toward the shooter.
const FRAME={
 0:{grip:[0,.06,.16],mag:[0,-.133,.138],bolt:[0,.1,-.011],muzzle:[0,.098,-.196],bore:.098,mark:[-.0245,.043,-.01]},
 1:{grip:[0,.02,.11],support:[-.017,.068,-.43],mag:[0,.138,-.22],bolt:[-.032,.19,-.422],muzzle:[0,.099,-.68],bore:.099,mark:[-.0345,.12,-.08]},
 2:{grip:[-.001,-.076,-.137],support:[-.001,-.009,-.636],mag:[0,-.002,-.397],bolt:[.033,.031,-.486],muzzle:[0,.03,-1.135],bore:.03,mark:[-.0315,.002,-.33]},
 3:{grip:[0,.012,.295],support:[0,.049,-.26],mag:[-.001,.101,.017],bolt:[0,.115,.03],muzzle:[0,.11,-.84],bore:.11,mark:[-.0315,.045,-.03]},
 // V42: the precision rifle's rig has no magazine or bolt node; its model brings both, placed here (support = palm on the forward grip).
 4:{grip:[0,.005,.585],support:[0,-.06,-.11],mag:[.003,.005,.2206],bolt:[0,.0812,.3225],muzzle:[0,.054,-1.092],bore:.054,mark:[-.0325,.1419,.1458]},
 5:{mark:[0,.0045,-.045]}
};
// V42 bO: the support hand in third person (bots, other players). `at` is where the centre of the left palm rests, in gun
// units; `roll` turns the palm about the bore from the handguard hold (palm up under the fore-end) towards a pistol's
// two-hand wrap. A design may bring its own; without one the class's frame applies. First person never reads it.
// Heights measured on each model (bOfix probe): the palm centre about 1.5 cm under the fore-end's surface, so the palm touches it.
const HOLD={0:{at:[-.1,-.05,.13],roll:-1.15},1:{at:[0,.035,-.43],roll:0},2:{at:[0,-.08,-.55],roll:0},3:{at:[0,.015,-.25],roll:0},4:{at:[0,-.065,-.03],roll:0}};
// V44 review: first person, the support hand's shift along a design's fore-end from the rig's own place (gun units),
// for designs whose fore-end is shorter or higher than the rig's (the hand reached past the MAGLIO's muzzle device).
const FP_SUPPORT={maglio:[0,-.02,.17],tafano:[0,0,0],cicala:[0,0,0],scure:[0,0,0]};
export const fpSupportShift=(index,key)=>{const id=/^[a-z]+/.exec(key||'')?.[0];return id&&id!=='stock'&&FP_SUPPORT[id]?.some(x=>x)?FP_SUPPORT[id]:null;};
export const holdFor=(index,finish)=>{const v=variantFor(index,finish?.model);return v?.hold||(v?.base?null:HOLD[index])||null;};
export const VARIANTS={
 // V36: CC BY models fitted into the base frames (see CREDITS.md). `fit` is in gun units
 // (twice real size): scale from the model's own units, rotation to put the muzzle on -z, position so the
 // hand's web lands on GripR. `parts` pick the magazine and the moving slide/bolt by node name.
 // V42 b4a: designs built for Orecchioni Battle (Blender scripts, no third-party model) in the base frame's own gun
 // units, so `fit` is the identity. They are weapons of their own: their handling is in weapon-stats.js.
 0:[{id:'zanzara',name:DESIGN_STATS.zanzara.name,tag:'PISTOLA AUTOMATICA',desc:'Pistola automatica dal muso ad ago: carrello sfaccettato con bindella ventilata, finestre sulla canna dorata e compensatore a due stadi. Caricatore da 20 e raffica rapidissima, fatta per le stanze strette.',file:'./assets/models/v42/zanzara.wasm',look:'zanzara',fit:{scale:1},parts:{mag:/zanzara_mag/,bolt:/zanzara_slide/},muzzleDz:-.0495,params:[]},
    {id:'cinghiale',name:DESIGN_STATS.cinghiale.name,tag:'PISTOLA PESANTE',desc:'Pistola pesante a carrello lungo: 7 colpi grossi, lenta e dura da tenere: da vicino un colpo alla testa basta anche con l’elmetto. Guancette in noce, cane esterno.',file:'./assets/models/v42/cinghiale.glb',look:'cinghiale',fit:{scale:1},parts:{mag:/cinghiale_mag/,bolt:/cinghiale_slide/},muzzleDz:-.046,muzzleDy:.004,params:[]}],
 1:[{id:'tafano',hold:{at:[0,.07,-.43],roll:0},name:'OB-220 TAFANO',tag:'MITRA COMPATTO',desc:'Mitra a polimero con calcio scheletrato e caricatore anteriore: leggero, nervoso, da corridoio.',file:'./assets/models/v36/tafano.glb',look:'tafano',fit:{scale:.0029,rotation:[0,Math.PI/2,0],position:[0,-.03,.055]},parts:{magBox:[[85,-110,-22],[140,2,22]]},muzzleDz:0,params:[]},
    {id:'cicala',hold:{at:[0,.035,-.43],roll:0},name:DESIGN_STATS.cicala.name,tag:'MITRA RAPIDO',desc:'Mitra a cadenza altissima: caricatore da 40, camicia di raffreddamento forata e calcio pieghevole in tondino. Da vicino non dà tregua.',file:'./assets/models/v42/cicala.wasm',look:'cicala',fit:{scale:1},parts:{mag:/cicala_mag/,bolt:/cicala_bolt/},muzzleDz:-.015,muzzleDy:.009,params:[]}],
 2:[{id:'maglio',hold:{at:[0,-.09,-.55],roll:0},name:'OB-315 MAGLIO',tag:'CARABINA COMPATTA',desc:'Carabina corta con slitta superiore, astina a feritoie e silenziatore. Il colpo grosso, accorciato.',file:'./assets/models/v36/maglio.glb',look:'maglio',fit:{scale:.02,rotation:[0,Math.PI,0],position:[0,-.216,-.157]},parts:{mag:/mag_low|mag_cap/i,bolt:/bolt_carrier/i},muzzleDz:0,params:[toggle('sil','Silenziatore',/SIL/)]}],
 // V42 b4b: built for Orecchioni Battle like the b4a designs; both are weapons of their own (weapon-stats.js).
 3:[{id:'scure',hold:{at:[0,.03,-.25],roll:0},name:DESIGN_STATS.scure.name,tag:'FUCILE DA BATTAGLIA',desc:'Fucile da battaglia semiautomatico con mirino reflex senza ingrandimento e bipiede ripiegato: 20 colpi pesanti, un colpo alla testa basta anche con l’elmetto. Più lento da ricaricare e meno preciso in corsa.',file:'./assets/models/v42/scure.wasm',world:'./assets/models/v42/scure-world.wasm',look:'scure',fit:{scale:1},parts:{mag:/scure_mag/,bolt:/scure_bolt/},muzzleDz:-.163,params:[]}],
 // V42: the OB-510 AVERLA's own look. `base` makes it what the class wears with no design chosen (it keeps the class
 // name and description); it loads with the weapons, so the old rifle of the rig is never seen. Straight-pull bolt
 // (position.z only, tested to +.246), detachable magazine, light mask on the model's UVs (weapon-fx.js).
 4:[{id:'averla',base:true,name:WEAPONS[4].name,tag:'MODELLO DI SERIE',note:'Finitura di fabbrica: ossidiana e oro, la luce corre lungo le linee. Kit e colori non cambiano questo modello.',file:'./assets/models/v42/eclisse.glb',fx:'./assets/models/v42/eclisse-fx.webp',fit:{scale:1},parts:{bolt:/eclisse_bolt/,mag:/eclisse_mag/},muzzleDz:-.0856,muzzleDy:.029,boltTravel:.246,params:[],lod:{file:'./assets/mobile/models/v42/eclisse-lod.bin',meshes:['eclisse_body']}},
  // V42: the rifle the class had before, kept as a second design: the rig's own model, its own hold; since b3 its own
  // light too (look 'classico', on the rig's second UV set), which EFFETTO PRIME turns off like any other.
  {id:'classico',classic:true,look:'classico',name:'OB-510 AVERLA CLASSICO',tag:'MODELLO SEMPLICE',desc:'Il fucile di precisione di prima: linee sobrie, otturatore girevole e una luce d’argento discreta.',params:[]},
  // V42 b4b: a semi-automatic marksman rifle on the same hold; its side handle sits where the AVERLA's bolt handle is, so
  // reload and inspection reach it as rehearsed.
  {id:'gheppio',hold:{at:[0,0,-.05],roll:0},name:DESIGN_STATS.gheppio.name,tag:'CECCHINO SEMIAUTOMATICO',desc:'Cecchino semiautomatico leggero: 10 colpi senza riarmare. Alla testa basta un colpo, al corpo ne servono due. Dopo ogni sparo l’ottica torna precisa in 0,65 secondi; meno preciso dall’anca e in corsa, ricarica più lenta.',file:'./assets/models/v42/gheppio.wasm',world:'./assets/models/v42/gheppio-world.wasm',look:'gheppio',fit:{scale:1},parts:{mag:/gheppio_mag/,bolt:/gheppio_bolt/},muzzleDz:.042,muzzleDy:.029,params:[]}],
 5:[{id:'artiglio',name:'ARTIGLIO',tag:'LAMA CURVA',desc:'Coltello ad artiglio con anello al pomolo, acciaio nero satinato.',file:'./assets/models/v36/artiglio.glb',look:'artiglio',fit:{scale:.00055,rotation:[0,0,-Math.PI/2],position:[0,0,-.019]},parts:{},params:[]},
    {id:'farfalla',name:'FARFALLA',tag:'PIEGHEVOLE',desc:'Coltello a farfalla in acciaio e ottone, lama a clip.',file:'./assets/models/v36/farfalla.glb',look:'farfalla',fit:{scale:.21,rotation:[3.0415,.7482,2.6867],position:[0,0,-.055]},parts:{},params:[]},
    {id:'bowie',name:'BOWIE OB',tag:'DA CAMPO',desc:'Lama larga vissuta, guardia d’ottone e manico in cuoio.',file:'./assets/models/v36/bowie.glb',look:'bowie',fit:{scale:.0072,rotation:[0,0,-Math.PI/2],position:[0,0,.06]},parts:{},params:[]}]
};
// No design (or the stock one) means the class's base design when it has one.
export const variantFor=(index,id)=>{const list=VARIANTS[index]||[];return list.find(v=>v.id===id)||(!id||id==='stock'?list.find(v=>v.base):null)||null;};
export const baseVariant=index=>(VARIANTS[index]||[]).find(v=>v.base)||null;
// The light of the rig's own model on a class with a base design (the AVERLA CLASSICO): dressed on the rig, its mask
// loaded the first time a root shows it.
export const classicLook=index=>(VARIANTS[index]||[]).find(v=>v.classic)?.look||null;
// The game compiles a design's programs and uploads its textures before the design is first shown (`setModelWarm`), so
// a weapon seen for the first time mid-match links nothing in a frame. Until the warm resolves roots keep the base model.
let modelWarm=null;export function setModelWarm(fn){modelWarm=fn;}
// Magazine and bolt nodes a rig lacks, at the frame's positions, so a design can hang its parts there.
export function ensureNodes(root,index){const F=FRAME[index];if(!root||!F)return;for(const [name,key]of [['Magazine','mag'],['ChargingHandle','bolt']])if(F[key]&&!root.getObjectByName(name)){const n=new T.Object3D();n.name=name;n.position.set(...F[key]);n.userData.addedNode=true;root.add(n);}}
// Base designs load with the weapons (and their light mask), so no rig, drop or body ever shows the old model.
export function preloadBaseModels(){return Promise.all(Object.entries(VARIANTS).flatMap(([index,list])=>list.filter(v=>v.base).map(v=>new Promise(resolve=>{const e=loadModel(v.file);const done=()=>resolve(!e.error);if(e.scene||e.error)return done();if(!modelPending.has(v.file))modelPending.set(v.file,[]);modelPending.get(v.file).push(done);}).then(ok=>v.fx?loadFxMask(+index).then(()=>ok):ok))));}
// V42 b5 review: every design of the slots on sale (both tiers), one file after the other, each warmed (setModelWarm) as
// it lands, so buying one never loads or links anything in play. Each file costs a long frame or two (its light mask, its
// programs), so `gate` holds the next one back while it says no (the game: while a match is being played) and an idle
// moment is awaited between files.
let designsLoad=null;
export function preloadDesigns(gate=()=>true,slots=[0,1,2,3,4]){if(designsLoad)return designsLoad;const files=[...new Set(slots.flatMap(i=>(VARIANTS[i]||[]).flatMap(v=>[v.file,v.world]).filter(Boolean)))];
 const idle=()=>new Promise(r=>globalThis.requestIdleCallback?requestIdleCallback(r,{timeout:1500}):setTimeout(r,50)),open=()=>new Promise(r=>{const tick=()=>gate()?idle().then(()=>gate()?r():setTimeout(tick,400)):setTimeout(tick,400);tick();});
 return designsLoad=files.reduce((chain,file)=>chain.then(open).then(()=>new Promise(resolve=>{const e=loadModel(file);if(e.scene||e.error)return resolve();if(!modelPending.has(file))modelPending.set(file,[]);modelPending.get(file).push(resolve);})),Promise.resolve());}
// V43 b56: one design ahead of its purchase (the buy menu calls it when a design is pointed at or picked with ← →): its
// files start loading and warming then, so the click that buys it a moment later finds it ready.
export function prefetchDesign(index,id){const v=variantFor(index,id);if(!v||typeof document==='undefined')return;for(const file of [v.file,v.world])if(file)loadModel(file);}
// Parameters clamped to their definitions; unknown keys dropped. `null` means the base model.
export function cleanBuild(index,id,build){
 const v=variantFor(index,id);if(!v)return null;const out={};
 for(const p of v.params){const raw=build?.[p.key];if(p.type==='range'){const n=Number(raw);out[p.key]=Number.isFinite(n)?Math.round(Math.min(p.max,Math.max(p.min,n))/p.step)*p.step:p.def;out[p.key]=+out[p.key].toFixed(2);}else{const n=Number(raw);out[p.key]=Number.isInteger(n)&&n>=0&&n<p.options.length?n:p.def;}}
 return out;
}
export const displayName=(index,finish)=>variantFor(index,finish?.model)?.name||WEAPONS[index]?.name||'Arma';
export const shortName=(index,finish)=>displayName(index,finish).replace(/^OB-\d+ /,'');
export const variantKey=(index,finish)=>{const v=variantFor(index,finish?.model);return v&&!v.classic?v.id+JSON.stringify(cleanBuild(index,v.id,finish?.build)):'stock';};
// Materials for the warm-up set (third-party models bring their own).
function palette(){
 const std=(name,color,roughness,metalness,role)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});m.name=name;m.envMapIntensity=.7;if(role==='accent')m.userData.finishRole='accent';if(role==='protected')m.userData.finishProtected=true;return m;};
 return {steel:std('ob-steel',0x4a5359,.52,.78),metal:std('ob-metal',0x7c8689,.4,.86,'accent'),polymer:std('ob-polymer',0x2b3336,.78,.04),anod:std('ob-anod',0x55646e,.46,.62,'accent'),rubber:std('ob-rubber',0x15191a,.93,0,'protected'),dark:std('ob-dark',0x0d1113,.7,.3,'protected'),bright:std('ob-bright',0xa4adaf,.33,.9,'protected'),glass:std('ob-glass',0x1a3d44,.12,.55,'protected'),edge:std('ob-edge',0x9aa3a1,.38,.78,'protected')};
}
// ---- maker's mark -----------------------------------------------------------------------
let markTexture=null;
function markMap(){
 if(markTexture!==null)return markTexture;
 try{const c=document.createElement('canvas');c.width=256;c.height=96;const g=c.getContext('2d');if(!g||typeof g.fillText!=='function'){markTexture=false;return markTexture;}
  g.fillStyle='#20272b';g.fillRect(0,0,256,96);g.strokeStyle='#7f8b8e';g.lineWidth=3;g.strokeRect(5,5,246,86);
  g.fillStyle='#c9d1cf';g.font='700 56px "Barlow Condensed", Impact, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('OB',62,46);
  g.font='700 20px "Barlow Condensed", Impact, sans-serif';g.textAlign='left';g.fillText('ORECCHIONI',104,34);g.fillText('BATTLE · ARMI',104,62);
  g.fillStyle='#8fa0a0';g.fillRect(96,22,2,52);
  markTexture=new T.CanvasTexture(c);markTexture.colorSpace=T.SRGBColorSpace;markTexture.anisotropy=8;}catch{markTexture=false;}
 return markTexture;
}
function addMark(root,index){
 const F=FRAME[index];if(!F?.mark)return;const map=markMap(),m=new T.MeshStandardMaterial({color:map?0xffffff:0x2b3337,roughness:.42,metalness:.6});if(map)m.map=map;m.userData.finishProtected=true;m.name='ob-mark';
 const plate=new T.Mesh(new T.PlaneGeometry(index===5?.02:.03,index===5?.0075:.0112),m);plate.name='MakerMark';plate.userData.variantMark=true;plate.userData.ownedGeometry=true;plate.renderOrder=1;
 plate.position.set(...F.mark);if(index===5)plate.rotation.x=-Math.PI/2;else plate.rotation.y=-Math.PI/2;root.add(plate);
}
// ---- third-party models (V36) ----------------------------------------------------------------
// A design may be a GLB instead of parts: a CC-BY model fitted into the base gun's frame by
// `fit` (scale, Euler rotation, position in gun units), with its magazine and bolt meshes
// picked by name so the rig's reload moves them. Files load once and are shared; a root asked
// to wear a model that is still loading keeps the base gun until the file arrives.
const modelLoader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),modelCache=new Map(),modelPending=new Map();
// A world-tier root (another player's weapon, a drop, a body) wears its own copy of each lit material, so one player's
// EFFETTO PRIME, light colour or paint never changes another's; the copies share the program and the textures.
function worldMaterial(root,entry,m){const w=entry.world.get(m);if(!root.userData.fxWorld||!w)return m;if(!w.userData.fx)return w;const copies=root.userData.fxCopies??=new Map();if(!copies.has(w))copies.set(w,cloneFx(w));return copies.get(w);}
// V43 b56: a 2048² colour map decoded to an ImageBitmap went to its sRGB texture in 27-33 ms of one frame (Chrome, ANGLE),
// the same pixels drawn into a canvas first in 2-4 ms. Opaque materials only (the canvas holds premultiplied colour).
// (b56 rev) Every map of an opaque material from 1024² up takes this route, the linear ones too (an opaque bitmap drawn
// into a canvas reads back bit-exact: tested on random RGB): a bitmap's pixels go to the GPU through the command buffer,
// and with the GPU queue full that upload waited 80-100 ms for it to drain; a canvas is copied GPU-side. The copy is
// made by the warm (game.js) just before the texture's own upload frame, so a file costs no long task when it arrives.
const toCanvas=new WeakSet();
export function canvasSource(t){const img=t?.image;if(!img||!toCanvas.has(t)||typeof ImageBitmap==='undefined'||!(img instanceof ImageBitmap)||img.width*img.height<1<<20)return;toCanvas.delete(t);
 try{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');if(!g)return;g.drawImage(img,0,0);t.image=c;t.needsUpdate=true;img.close?.();}catch{}}
function loadModel(file){
 if(modelCache.has(file))return modelCache.get(file);
 const entry={scene:null,error:null,world:new Map()};modelCache.set(file,entry);
 if(typeof document==='undefined'){entry.error='no browser';return entry;}
 // A design with a light mask: its own material is the view tier, `world` maps it to the dim clone worn in the arena.
 // V42 b3: the Officina designs name their own look (`look`), the AVERLA its class (`fx`).
 const owner=Object.entries(VARIANTS).flatMap(([i,list])=>list.map(v=>[i,v])).find(([,v])=>(v.file===file||v.world===file)&&(v.fx||v.look)),fxKey=owner?(owner[1].look||+owner[0]):null,fx=fxKey!==null;
 modelLoader.loadAsync(file).then(g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of [].concat(o.material))if(m){m.envMapIntensity=.7;for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key])m[key].anisotropy=8;if(!m.transparent&&!m.alphaTest)for(const key of ['map','emissiveMap','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[key]?.isTexture)toCanvas.add(m[key]);if(fx&&!entry.world.has(m))entry.world.set(m,dressFx(m,fxKey)||m);}}});
  if(worldLod)startLod(file,entry,g.scene);
  // V43 b56: a monolithic model's magazine is cut out now, while the file warms, not in the frame of the first purchase.
  // (b56 rev) In a task of its own, one mesh at a time, so it does not lengthen the task that receives the file.
  const magBox=Object.values(VARIANTS).flat().find(v=>v.file===file&&v.parts?.magBox)?.parts.magBox;if(magBox){g.scene.updateMatrixWorld(true);entry.splits??=new Map();const meshes=[];g.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
   const next=()=>{const o=meshes.shift();if(!o)return;if(!entry.splits.has(o.uuid))entry.splits.set(o.uuid,splitMesh(o.geometry,magBox,o.matrixWorld));setTimeout(next,0);};setTimeout(next,0);}
  const ready=()=>{entry.scene=g.scene;for(const job of modelPending.get(file)||[])job();modelPending.delete(file);};
  return Promise.resolve(fx?loadFxMask(fxKey):null).then(()=>modelWarm?.(g.scene,entry.world)).catch(e=>console.warn('Preparazione modello',file,e)).then(ready);}).catch(e=>{entry.error=e;console.error('Modello non caricato',file,e);const jobs=modelPending.get(file)||[];modelPending.delete(file);for(const job of jobs)job();});
 return entry;
}
// Phone world tier (V42 review): other players', bodies' and drops' copies of a design with `lod` draw a decimated
// body (tools/build_eclisse_lod.py, 7.3k of 24.4k triangles). They all share one stand-in geometry that starts on the
// full mesh's buffers and is switched in place when the file arrives, so start-up waits for nothing.
let worldLod=false;export function useWorldLod(){worldLod=true;}
function startLod(file,entry,scene){
 const v=Object.values(VARIANTS).flat().find(v=>v.file===file&&v.lod);if(!v)return;entry.lodGeo=new Map();
 scene.traverse(o=>{if(!o.isMesh||!v.lod.meshes.includes(o.name))return;const g=new T.BufferGeometry();for(const [n,a]of Object.entries(o.geometry.attributes))g.setAttribute(n,a);g.setIndex(o.geometry.index);g.boundingSphere=o.geometry.boundingSphere;g.name=o.name+' / world';entry.lodGeo.set(o,g);});
 fetch(v.lod.file).then(r=>r.ok?r.arrayBuffer():Promise.reject(new Error('HTTP '+r.status))).then(buf=>{for(const g of entry.lodGeo.values())decodeLod(buf,g);}).catch(e=>console.warn('LOD non caricato',v.lod.file,e));
}
// 'OBL1', counts, position and uv boxes; uint16 positions, int8 normals, uint16 uvs, uint16 indices (tools/build_eclisse_lod.py).
function decodeLod(buf,g){
 const dv=new DataView(buf),f=o=>dv.getFloat32(o,true);if(dv.getUint32(0,true)!==0x314c424f)return;
 const n=dv.getUint32(4,true),m=dv.getUint32(8,true),lo=[f(12),f(16),f(20)],hi=[f(24),f(28),f(32)],ul=[f(36),f(40)],uh=[f(44),f(48)];let o=52;
 const qp=new Uint16Array(buf,o,n*3);o+=n*6;const qn=new Int8Array(buf,o,n*4);o+=n*4;const qu=new Uint16Array(buf,o,n*2);o+=n*4;const idx=new Uint16Array(buf,o,m);
 const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2),nv=new T.Vector3();
 for(let i=0;i<n;i++){for(let k=0;k<3;k++)pos[i*3+k]=lo[k]+qp[i*3+k]/65535*(hi[k]-lo[k]);nv.set(qn[i*4],qn[i*4+1],qn[i*4+2]).normalize();nor[i*3]=nv.x;nor[i*3+1]=nv.y;nor[i*3+2]=nv.z;for(let k=0;k<2;k++)uv[i*2+k]=ul[k]+qu[i*2+k]/65535*(uh[k]-ul[k]);}
 g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(nor,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(new T.BufferAttribute(new Uint16Array(idx),1));
 g.deleteAttribute('tangent');g.computeTangents();g.computeBoundingSphere();
}
// Monolithic models: triangles inside `parts.magBox` (model units) become the magazine so the reload can move it.
function splitMesh(geo,box,world){const attrs=Object.entries(geo.attributes),plain=attrs.every(([,a])=>!a.isInterleavedBufferAttribute);
  if(!plain)return splitSlow(geo,box,world);
  // (b56 rev) Same triangles, same attribute arrays as the generic path, ~5× faster: the centroid is transformed once
  // (an affine map keeps it) and corners are copied with typed-array sets, so it fits a phone frame while the file warms.
  const idx=geo.index?.array,P=geo.attributes.position.array,n=idx?idx.length/3:geo.attributes.position.count/3,e=world.elements,mag=new Uint8Array(n);let m=0;
  const [x0,y0,z0]=box[0],[x1,y1,z1]=box[1];
  for(let t=0;t<n;t++){let cx=0,cy=0,cz=0;for(let k=0;k<3;k++){const i=(idx?idx[t*3+k]:t*3+k)*3;cx+=P[i];cy+=P[i+1];cz+=P[i+2];}cx/=3;cy/=3;cz/=3;
   const wx=e[0]*cx+e[4]*cy+e[8]*cz+e[12],wy=e[1]*cx+e[5]*cy+e[9]*cz+e[13],wz=e[2]*cx+e[6]*cy+e[10]*cz+e[14];if(wx>=x0&&wx<=x1&&wy>=y0&&wy<=y1&&wz>=z0&&wz<=z1){mag[t]=1;m++;}}
  const pick=(flag,count)=>{if(!count)return null;const out=new T.BufferGeometry();for(const [name,a] of attrs){const s=a.itemSize,src=a.array,arr=new src.constructor(count*3*s);let k=0;
    for(let t=0;t<n;t++){if(mag[t]!==flag)continue;if(idx)for(let c=0;c<3;c++){const o=idx[t*3+c]*s;for(let j=0;j<s;j++)arr[k++]=src[o+j];}else{arr.set(src.subarray(t*3*s,(t+1)*3*s),k);k+=3*s;}}
    out.setAttribute(name,new T.BufferAttribute(arr,s,a.normalized));}out.computeBoundingSphere();return out;};
  return {body:pick(0,n-m),mag:pick(1,m)};}
function splitSlow(geo,box,world){const src=geo.index?geo.toNonIndexed():geo,pos=src.attributes.position,names=Object.keys(src.attributes),v=new T.Vector3(),inside=i=>{v.fromBufferAttribute(pos,i).applyMatrix4(world);return v.x>=box[0][0]&&v.x<=box[1][0]&&v.y>=box[0][1]&&v.y<=box[1][1]&&v.z>=box[0][2]&&v.z<=box[1][2];};
  // A triangle belongs to the magazine when its centroid is in the box: magazine sides are long quads that reach the receiver.
  const c=new T.Vector3(),centroidIn=t=>{c.set(0,0,0);for(let k=0;k<3;k++)c.add(v.fromBufferAttribute(pos,t+k).applyMatrix4(world));c.multiplyScalar(1/3);return c.x>=box[0][0]&&c.x<=box[1][0]&&c.y>=box[0][1]&&c.y<=box[1][1]&&c.z>=box[0][2]&&c.z<=box[1][2];};
  const keep=[[],[]];for(let t=0;t<pos.count;t+=3)keep[centroidIn(t)?1:0].push(t);
  const pick=list=>{if(!list.length)return null;const out=new T.BufferGeometry();for(const n of names){const a=src.attributes[n],arr=new a.array.constructor(list.length*3*a.itemSize);let k=0;for(const t of list)for(let v=0;v<3;v++)for(let c=0;c<a.itemSize;c++)arr[k++]=a.array[(t+v)*a.itemSize+c];out.setAttribute(n,new T.BufferAttribute(arr,a.itemSize,a.normalized));}out.computeBoundingSphere();return out;};
  return {body:pick(keep[0]),mag:pick(keep[1])};}
// V42 b4b review: a design with `world` (tools/v42-b4a-weapons/lite.py) dresses other players', bots', bodies' and drops'
// copies with that lighter file (decimated, no glass, one material per part); the first-person model stays the full one.
const fileFor=(variant,root)=>root.userData.fxWorld&&variant.world||variant.file;
function modelGroups(variant,root,build){
 const entry=loadModel(fileFor(variant,root));if(!entry.scene)return null;const hidden=(variant.params||[]).filter(p=>p.hides&&build?.[p.key]===1).map(p=>p.hides);
 const fit=variant.fit||{},q=new T.Quaternion().setFromEuler(new T.Euler(...(fit.rotation||[0,0,0]))),s=fit.scale||1,pos=new T.Vector3(...(fit.position||[0,0,0]));
 const place=g=>{g.quaternion.copy(q);g.scale.setScalar(s);g.position.copy(pos);g.userData.variantPart=true;return g;};
 const groups={body:place(new T.Group()),mag:place(new T.Group()),bolt:place(new T.Group())};groups.body.name='Variant / body';groups.mag.name='Variant / mag';groups.bolt.name='Variant / bolt';
 const parts=variant.parts||{};entry.scene.updateMatrixWorld(true);
 entry.splits??=new Map();
 entry.scene.traverse(o=>{if(!o.isMesh)return;
  if(parts.magBox){const key=o.uuid;if(!entry.splits.has(key))entry.splits.set(key,splitMesh(o.geometry,parts.magBox,o.matrixWorld));const sp=entry.splits.get(key);for(const [role,geo] of Object.entries(sp)){if(!geo)continue;const mesh=new T.Mesh(geo,worldMaterial(root,entry,o.material));mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.variantPart=true;mesh.userData.sharedModel=true;mesh.name=o.name+'/'+role;mesh.matrix.copy(o.matrixWorld);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);groups[role].add(mesh);}return;}
  const mesh=new T.Mesh(root.userData.fxWorld&&entry.lodGeo?.get(o)||o.geometry,worldMaterial(root,entry,o.material));mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.variantPart=true;mesh.userData.sharedModel=true;mesh.name=o.name;mesh.matrix.copy(o.matrixWorld);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);
  const label=[o.name,o.parent?.name,o.parent?.parent?.name].filter(Boolean).join(' ')+' '+[].concat(o.material).map(m=>m?.name||'').join(' ');if(parts.exclude&&parts.exclude.test(label))return;if(hidden.some(rx=>rx.test(label)))return;const target=parts.mag&&parts.mag.test(label)?'mag':parts.bolt&&parts.bolt.test(label)?'bolt':'body';groups[target].add(mesh);});
 for(const key of Object.keys(groups))if(!groups[key].children.length)delete groups[key];
 return {groups,muzzleDz:variant.muzzleDz||0,muzzleDy:variant.muzzleDy||0};
}
// ---- apply ---------------------------------------------------------------------------------
// Builds or swaps the model on a weapon root (a rig's Gun_* node, a display gun or the knife).
export function applyVariant(root,index,finish){
 if(!root)return;if(!root.userData.variantMark){root.userData.variantMark=true;addMark(root,index);}
 const variant=variantFor(index,finish?.model),key=variantKey(index,finish);
 root.userData.hold=holdFor(index,finish);
 // V42 b5: the last design asked for wins: a file that arrives late never puts back a design changed since (a paid design
 // replacing the loadout's at a round start, a quick change in the Officina).
 root.userData.variantWant=key;
 if(root.userData.variantKey===key){syncKits(root,key!=='stock');return;}
 root.userData.variantKey=key;
 const old=[];root.traverse(o=>{if(o.userData.variantPart&&!o.parent?.userData.variantPart)old.push(o);});
 for(const o of old){o.removeFromParent();o.traverse(x=>{if(x.isMesh&&!x.userData.sharedModel){x.geometry.dispose();for(const mat of [].concat(x.material))mat.dispose?.();}});}
 const stock=key==='stock';const kits=new Set();for(const [,group] of root.userData.cosmeticKits||[])group.traverse(o=>kits.add(o));
 // `variantHidden`: the start-up texture upload skips what a design hides (V42: the rig's old rifle under the AVERLA).
 root.traverse(o=>{if(!o.isMesh||o.userData.variantPart||o.userData.variantMark||kits.has(o)||o.material?.isMeshBasicMaterial)return;o.visible=stock;o.userData.variantHidden=!stock;});
 const socket=root.getObjectByName('MuzzleSocket')||root.getObjectByName('MuzzleDeviceTip');if(socket){socket.userData.restZ??=socket.position.z;socket.userData.restY??=socket.position.y;socket.position.z=socket.userData.restZ;socket.position.y=socket.userData.restY;}
 syncKits(root,!stock);if(stock){if(baseVariant(index)&&classicLook(index))loadFxMask(classicLook(index));return;}
 const build=cleanBuild(index,variant.id,finish?.build);
 const built=modelGroups(variant,root,build);
 if(!built){root.userData.variantKey=null;root.traverse(o=>{if(!o.isMesh||o.userData.variantPart||o.userData.variantMark||kits.has(o)||o.material?.isMeshBasicMaterial)return;o.visible=true;o.userData.variantHidden=false;});syncKits(root,true);
  {const file=fileFor(variant,root);if(!modelCache.get(file)?.error){if(!modelPending.has(file))modelPending.set(file,[]);modelPending.get(file).push(()=>{if(root.userData.variantWant===key)applyVariant(root,index,finish);});}}return;}
 const {groups,muzzleDz,muzzleDy}=built;
 root.updateMatrixWorld(true);
 for(const [name,g]of Object.entries(groups)){root.add(g);const node=name==='mag'?root.getObjectByName('Magazine'):name==='bolt'?root.getObjectByName('ChargingHandle'):null;if(node&&node!==root){g.updateMatrixWorld(true);node.attach(g);}}
 if(socket&&muzzleDz)socket.position.z=socket.userData.restZ+muzzleDz;if(socket&&muzzleDy)socket.position.y=socket.userData.restY+muzzleDy;
 // V42 b4a: a design that arrives after it was chosen changes the root's size; the Officina refits its framing on this.
 root.userData.variantStamp=(root.userData.variantStamp||0)+1;
}
// Cosmetic kits belong to the base model: a variant brings its own furniture (V42 b3b: also while its file is still
// loading and the base gun stands in, so a kit never flashes on and off).
function syncKits(root,hide){for(const [,group] of root.userData.cosmeticKits||[])group.userData.kitHidden=hide;if(hide)for(const [,group] of root.userData.cosmeticKits||[])group.visible=false;}
// Compiles the plain OB materials once so the first variant weapon seen mid-match links no shader.
export function warmVariantMaterials(){const m=palette();const g=new T.Group();g.add(warmKitMaterials());for(const mat of Object.values(m)){const mesh=new T.Mesh(new T.BoxGeometry(.01,.01,.01),mat);mesh.frustumCulled=false;g.add(mesh);}const map=markMap();if(map){const mm=new T.MeshStandardMaterial({map,roughness:.42,metalness:.6});g.add(new T.Mesh(new T.PlaneGeometry(.01,.01),mm));}
 // V42 b7: a design that arrives mid-round (a quick start, before the lobby preload) must find its plain parts linked: a
 // blended two-faced lens (GHEPPIO, SCURE) and a plain textured two-faced part (the CINGHIALE wood).
 {const tx=new T.DataTexture(new Uint8Array([128,128,128,255]),1,1);tx.colorSpace=T.SRGBColorSpace;tx.needsUpdate=true;for(const mat of [new T.MeshStandardMaterial({color:0x0a1012,transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide,roughness:.05,metalness:.2,envMapIntensity:.7}),new T.MeshStandardMaterial({map:tx,side:T.DoubleSide,roughness:.5,metalness:0,envMapIntensity:.7})]){const mesh=new T.Mesh(new T.BoxGeometry(.01,.01,.01),mat);mesh.frustumCulled=false;g.add(mesh);}}
 return g;}
