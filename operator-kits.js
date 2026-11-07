// V35 operators, V37 third-party gear. Every player picks a kit (silhouette and gear), an
// accent colour and a few toggles; bots get varied kits. The body, its team tint and the
// rig never change. The gear is third-party (Sketchfab CC-BY models, credits in
// assets/CREDITS.md) and fitted around the skeleton's own anchors (head, chest, shoulders)
// in the rest pose; the team's cloth tags and accent trims stay procedural so friend or foe
// reads at a glance: the team tint owns the body, the accent only the trims.
// Materials are shared per team and accent (V34 batching) and per model, never per operator.
import {cleanTint} from './smoke-rules.js?v=42.0';
import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/addons/libs/meshopt_decoder.module.js';
import {PAINTS} from './weapon-finish.js?v=42.0';
// V44 GIRO 1: eight operators. ASSALTO, SFONDAMENTO and (V44 op2) MASTINO keep the soldier's body with their own cut
// (operator-wear.js); the other five are whole bodies from CC BY 4.0 models (BODIES below, assets/CREDITS.md) drawn on the operator's own skeleton,
// at the same head height and with the same hit zones (combat-rules.js never reads the body). RICOGNIZIONE, TIRATORE,
// CORAZZA and BOREA went to archivio/v44-operatori/ (code and models); an old saved or received id becomes the nearest kit.
export const KITS=[
 {id:'assalto',name:'ASSALTO',tag:'LINEA',toggles:{visor:'Visore notturno',mask:'Maschera facciale',pack:'Zaino d’assalto'},desc:'Entra per primo. Il braccio sinistro, quello che apre la porta, è protetto da una guardia nel colore della squadra; il giubbotto scuro è tagliato in diagonale e una cinghia di caricatori lo attraversa dal fianco alla spalla. Il braccio destro resta libero per sparare.'},
 {id:'sfondamento',name:'SFONDAMENTO',tag:'PESANTE',toggles:{visor:null,mask:'Respiratore a doppio filtro',pack:'Zaino largo'},desc:'Il muro che avanza. Tutta la protezione è davanti: una grande piastra sul petto con una fascia nel colore della squadra, collo alto, pancia coperta da tre piastre, gambe corazzate. Spalle strette al corpo, per non sembrare più largo di quello che è.'},
 {id:'mastino',name:'MASTINO',tag:'ASSALTO',toggles:{},desc:'Fanteria corazzata. Piastre a segmenti su tutto il corpo, casco chiuso con la visiera stretta: le piastre grandi prendono il colore della squadra, sotto una tuta nera.'},
 {id:'saetta',name:'SAETTA',tag:'RICOGNIZIONE',toggles:{},desc:'Corre davanti a tutti. Armatura leggera a placche chiare sopra una tuta scura, casco aerodinamico con visiera avvolgente e cresta, strisce luminose nel colore della squadra lungo braccia e gambe.'},
 {id:'onice',name:'ONICE',tag:'PESANTE',toggles:{},desc:'Una tuta da combattimento nera con le nervature nel colore della squadra, il casco con il visore a fessura. Il simbolo sul petto e il visore si accendono nel colore della squadra.'},
 {id:'astore',name:'ASTORE',tag:'SUPPORTO',toggles:{},desc:'Pilota di soccorso. Tuta da volo imbottita nel colore della squadra, casco tondo con la visiera dorata, stivali e guanti scuri.'},
 {id:'corvo',name:'CORVO',tag:'TIRATORE',toggles:{},desc:'Tuta da volo scura e casco con la visiera fumé, zaino leggero sulla schiena. Spalle e braccia nel colore della squadra, il resto si perde nell’ombra.'},
 {id:'lince',name:'LINCE',tag:'INCURSORE',toggles:{},desc:'Incursore silenzioso: tuta leggera nel colore della squadra, spallacci a piastre, cappuccio scuro e piastra facciale con fessura luminosa per gli occhi.'}
];
// The five whole bodies: file (phones load the copy under assets/mobile/), how much of the team dye the "_Team" parts take (mix,
// default 1). V44 op3: each one IS the soldier's body (the ASSALTO/SFONDAMENTO build, his skin weights): the operator's own model is
// baked onto his suit as colour, surface relief, glow and team mask (art/source/v44/agenti/build/bake.py) and only its helmet stays
// its own geometry, rigid on the head; so shoulders, chest, arms, hips, legs and feet are his, measured equal by tools/check_operators.mjs.
// detail (V44 op6b, SAETTA and LINCE): the team dye follows the texture's brightness more steeply (lum^.75 instead of its square
// root, same mean), so seams and stitching still read at game distance; 0 or absent: as before.
// gloves and boots: the soldier's own (fingers closed on the weapon), cut from his suit in the game (assets.js skinPart).
export const BODIES={
 saetta:{file:'./assets/models/v44/saetta.wasm',gloves:1,boots:1,detail:1},
 onice:{file:'./assets/models/v44/onice.wasm',gloves:1,boots:1},
 astore:{file:'./assets/models/v44/astore.wasm',gloves:1,boots:1},
 corvo:{file:'./assets/models/v44/corvo.wasm',gloves:1,boots:1},
 lince:{file:'./assets/models/v44/lince.wasm',gloves:1,boots:1,detail:1}
};
// Ids of operators that are no longer offered: an old saved choice or an old peer's choice is dressed as the nearest kit.
export const RETIRED_KITS={ricognizione:'saetta',tiratore:'corvo',corazza:'onice',borea:'assalto'};
export const DEFAULT_OPERATOR={kit:'assalto',accent:'graphite',visor:0,mask:0,pack:0,smoke:0,glow:1};
export const kitFor=id=>KITS.find(k=>k.id===id)||null;
// Masks and hoods were modelled on a smaller head: the base head shrinks under them, so nothing
// pokes through; gear parented to the head bone is compensated in dressOperator.
export function headScale(operator){const o=cleanOperator(operator);return o.kit==='sfondamento'?.86:o.kit==='mastino'?.93:1;}
export function cleanOperator(v){
 const id=RETIRED_KITS[v?.kit]||v?.kit,kit=kitFor(id)?id:'assalto';
 return {kit,accent:Object.hasOwn(PAINTS,v?.accent)?v.accent:'graphite',visor:v?.visor?1:0,mask:v?.mask?1:0,pack:v?.pack?1:0,smoke:cleanTint(v?.smoke),glow:v?.glow===0||v?.glow===false?0:1};
}
// Templates are keyed by the gear generation too: once the third-party models arrive, every
// dressed operator is rebuilt on its next dressOperator call.
let gearGeneration=0;
export const operatorKey=(team,v)=>{const o=cleanOperator(v);return team+':'+o.kit+':'+o.accent+':'+o.visor+o.mask+o.pack+':g'+gearGeneration;};
export const operatorName=v=>kitFor(cleanOperator(v).kit).name;
// Bots wear every kit in turn, with the team's own accent, so a squad reads as a squad: eight bots in a row show all eight.
export function botOperator(serial,team){const n=Math.abs(serial|0);return {kit:KITS[n%KITS.length].id,accent:team==='blue'?'naval':'sand',visor:serial%3===0?1:0,mask:serial%2===1?1:0,pack:serial%4===2?1:0};}
// ---- materials, shared per team and accent -------------------------------------------
const looks=new Map();
export function operatorLook(team,accent){
 const key=team+':'+accent;if(looks.has(key))return looks.get(key);
 const mat=(name,color,roughness,metalness,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness,metalness,...extra});m.name='op-'+name;m.userData.teamLook=true;return m;};
 const blue=team==='blue';
 const look={
  base:mat('base',blue?0x4a5a62:0x6e6248,.9,0),            // gear shell: slate for Scolta, khaki for Razziatori
  cloth:mat('cloth',blue?0x6f9ba9:0xb6855f,1,0),            // team cloth (tags, shemagh, hood)
  rubber:mat('rubber',0x252e2b,.84,0),
  lens:mat('lens',0x263b3c,.3,.15,{envMapIntensity:.5}),
  metal:mat('metal',0x6a7375,.45,.7),
  accent:mat('accent',PAINTS[accent]?.hex||'#45535d',.72,.08)
 };look.team=team;
 looks.set(key,look);return look;
}
// ---- third-party gear ---------------------------------------------------------------
// Each file is loaded once; its meshes are shared by every operator wearing the piece
// (geometry and materials are never disposed with a body). Fits are in metres relative to
// the anchor point, in the rest pose with the operator facing -z, +x the right hand.
// `own` pieces are centred on their own bounds (packs of several objects); the others on
// the whole model's bounds, so pieces of one model keep their authored alignment.
export const GEAR_FILES={
 casco_a:'./assets/models/v37/casco_a.glb',casco_b:'./assets/models/v37/casco_b.glb',
 pacco_teste:'./assets/models/v37/pacco_teste.glb',nvg:'./assets/models/v37/nvg.glb',zaino_a:'./assets/models/v37/zaino_a.glb'
 // V44: the balaclava, headset, goggles and binoculars left with RICOGNIZIONE, TIRATORE and BOREA: no longer downloaded.
};
export const PIECES={
 casco_a:{model:'casco_a',only:/Helmet_Base|Glasses/,fit:{scale:.0062,rotation:[0,Math.PI,0],position:[0,.01,-.01]}},
 maschera_a:{model:'casco_a',only:/Mask/,fit:{scale:.0062,rotation:[0,Math.PI,0],position:[0,.01,-.01]}},
 casco_b:{model:'casco_b',fit:{scale:.3,rotation:[0,Math.PI/2,0],position:[0,.02,-.01]}},
 nvg:{model:'nvg',fit:{scale:.75,rotation:[0,Math.PI,0],position:[0,.035,-.175]}},
 zaino_a:{model:'zaino_a',fit:{scale:.55,rotation:[0,0,0],position:[0,.02,.27]}},
 zaino_b:{model:'zaino_a',fit:{scale:.5,rotation:[0,0,0],position:[0,.01,.25]}},
 zaino_c:{model:'zaino_a',fit:{scale:.45,rotation:[0,0,0],position:[0,.03,.235]}},
 antigas:{model:'pacco_teste',only:/GasMask/,own:true,fit:{scale:1.1,rotation:[0,Math.PI,0],position:[0,.0,-.045]}},
 mezza_maschera:{model:'pacco_teste',only:/Mask_ballistic/,own:true,fit:{scale:.94,rotation:[0,Math.PI,0],position:[0,-.012,-.035]}}
};
const gearScenes=new Map(),gearBounds=new Map();
export const gearReady=()=>gearScenes.size===Object.keys(GEAR_FILES).length;
export function gearScene(id){return gearScenes.get(id)||null;}
// Skinned pieces (the gas mask ships rigged) are baked to plain meshes in their bind pose.
function bakeSkins(scene){
 scene.updateMatrixWorld(true);const skinned=[];scene.traverse(o=>{if(o.isSkinnedMesh)skinned.push(o);});
 for(const s of skinned){s.skeleton.update();const src=s.geometry,geo=src.clone(),pos=geo.attributes.position,v=new T.Vector3();
  for(let i=0;i<pos.count;i++){s.applyBoneTransform(i,v.fromBufferAttribute(pos,i));pos.setXYZ(i,v.x,v.y,v.z);}
  for(const k of ['skinIndex','skinWeight'])geo.deleteAttribute(k);geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();
  const mesh=new T.Mesh(geo,s.material);mesh.name=s.name;mesh.matrix.copy(s.matrix);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);s.parent.add(mesh);s.removeFromParent();}
 scene.updateMatrixWorld(true);
}
// Models used whole are merged to one mesh per material at load: a quad night-vision set is one draw, not four.
function mergeByMaterial(scene){
 scene.updateMatrixWorld(true);const byMat=new Map();scene.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)){if(!byMat.has(o.material))byMat.set(o.material,[]);byMat.get(o.material).push(o);}});
 for(const [mat,list] of byMat){if(list.length<2)continue;const geos=list.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);return g;});
  const merged=mergeGeometries(geos,false);for(const g of geos)g.dispose();if(!merged)continue;merged.computeBoundingBox();merged.computeBoundingSphere();
  const mesh=new T.Mesh(merged,mat);mesh.name=list[0].name;scene.add(mesh);for(const o of list)o.removeFromParent();}
 scene.updateMatrixWorld(true);
}
// Colour corrections of the bought-in textures: a charcoal knit instead of pure black, a field-drab pack instead of white, dark lenses instead of purple.
const LOOK_FIX={
 passamontagna(m){m.map=null;m.color.set(0x34393a);m.roughness=1;m.metalness=0;m.side=T.DoubleSide;},
 zaino_a(m){m.color.set(0x8a8468);},
 occhiali(m){if(m.name==='Default'){m.color.set(0x3c423c);m.roughness=.7;}else{m.color.set(0x1a2226);m.opacity=.82;m.roughness=.12;m.metalness=.5;}},
 // V43 oR rev: the face wrap and the shooter's hood keep their shapes, not their printed patterns (a checked keffiyeh, a skull).
 pacco_teste(m){if(/EquipAtlas|HoodMaskMain/.test(m.name))m.side=T.DoubleSide;if(m.name==='EquipAtlas'){m.map=null;m.color.set(0x5c5d4a);m.roughness=1;m.metalness=0;}if(m.name==='HoodMaskMain'){m.map=null;m.color.set(0x24282b);m.roughness=.95;m.metalness=0;}if(m.name==='Glass'){m.color.set(0x11161a);m.roughness=.18;m.metalness=.4;}if(m.name==='GasMaskWindow'){m.color.set(0x3d5358);m.roughness=.1;m.metalness=.75;m.envMapIntensity=1.6;}}
};
export async function preloadOperatorGear(){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 await Promise.all(Object.entries(GEAR_FILES).map(async([id,file])=>{
  if(gearScenes.has(id))return;
  try{const g=await loader.loadAsync(file);const scene=g.scene;bakeSkins(scene);if(!Object.values(PIECES).some(p=>p.model===id&&p.only))mergeByMaterial(scene);
   scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.userData.teamLook=true;m.userData.operatorGear=true;m.side=T.FrontSide;LOOK_FIX[id]?.(m,o);}o.geometry.computeBoundingBox();});
   gearScenes.set(id,scene);gearBounds.set(id,new T.Box3().setFromObject(scene));gearGeneration++;}
  catch(e){console.error('Equipaggiamento non caricato',file,e);}
 }));
 return gearScenes.size;
}
// ---- parts ---------------------------------------------------------------------------
// Anchors are world positions in the rest pose with the operator facing -z: `head` is the
// head bone + 10.5 cm (eye level), `chest` the Spine2 bone, `hips` the Hips bone,
// `shoulderL`/`shoulderR` the arm roots; `side` is +1 when the right hand lies at +x.
class Parts{
 constructor(){this.groups=new Map();this.pieces=new Map();}
 add(anchor,geo,mat,x,y,z,rot=null,scale=null){let g=this.groups.get(anchor);if(!g){g=[];this.groups.set(anchor,g);}const m=new T.Matrix4().compose(new T.Vector3(x,y,z),rot?new T.Quaternion().setFromEuler(new T.Euler(...rot)):new T.Quaternion(),scale?new T.Vector3(...scale):new T.Vector3(1,1,1));g.push({geo,mat,m});}
 box(anchor,mat,x,y,z,w,h,d,rot,scale){this.add(anchor,new T.BoxGeometry(w,h,d),mat,x,y,z,rot,scale);}
 sphere(anchor,mat,x,y,z,r,scale,rot,phiStart=0,phiLength=Math.PI*2,thetaStart=0,thetaLength=Math.PI){this.add(anchor,new T.SphereGeometry(r,20,12,phiStart,phiLength,thetaStart,thetaLength),mat,x,y,z,rot,scale);}
 torus(anchor,mat,x,y,z,r,t,rot,scale){this.add(anchor,new T.TorusGeometry(r,t,6,28),mat,x,y,z,rot,scale);}
 cyl(anchor,mat,x,y,z,r,len,rot,scale){this.add(anchor,new T.CylinderGeometry(r,r,len,14),mat,x,y,z,rot,scale);}
 // A third-party piece: shared meshes of a loaded model placed by its fit.
 model(anchor,id){let g=this.pieces.get(anchor);if(!g){g=[];this.pieces.set(anchor,g);}g.push(id);}
 // One merged mesh per material per anchor for the procedural trims; third-party pieces keep
 // their own shared geometry and materials (one draw per material each).
 build(){
  const out=new Map(),anchors=new Set([...this.groups.keys(),...this.pieces.keys()]);
  for(const anchor of anchors){
   const group=new T.Group();group.name='Gear / '+anchor;group.userData.operatorGear=true;
   const list=this.groups.get(anchor)||[];
   for(const mat of new Set(list.map(p=>p.mat))){
    const geos=list.filter(p=>p.mat===mat).map(p=>{const g=p.geo.index?p.geo.toNonIndexed():p.geo;if(g!==p.geo)p.geo.dispose();g.applyMatrix4(p.m);return g;});
    const merged=mergeGeometries(geos,false);for(const g of geos)g.dispose();if(!merged)continue;merged.computeBoundingSphere();
    const mesh=new T.Mesh(merged,mat);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.ownedGeometry=true;mesh.name='Gear '+anchor+' '+mat.name;group.add(mesh);
   }
   for(const id of this.pieces.get(anchor)||[])placePiece(group,anchor,id);
   out.set(anchor,group);
  }
  return out;
 }
}
const pieceCentres=new Map();
function placePiece(group,anchor,id){
 const piece=PIECES[id],scene=piece&&gearScenes.get(piece.model);if(!scene)return;
 const match=o=>o.isMesh&&(!piece.only||piece.only.test(o.name+'|'+(o.parent?.name||'')));
 let centre=pieceCentres.get(id);
 if(!centre){const b=piece.own?new T.Box3():gearBounds.get(piece.model).clone();if(piece.own)scene.traverse(o=>{if(match(o))b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});centre=b.getCenter(new T.Vector3());pieceCentres.set(id,centre);}
 const f=piece.fit,fit=new T.Matrix4().compose(new T.Vector3(...(f.position||[0,0,0])),new T.Quaternion().setFromEuler(new T.Euler(...(f.rotation||[0,0,0]))),new T.Vector3().setScalar(f.scale||1)).multiply(new T.Matrix4().makeTranslation(-centre.x,-centre.y,-centre.z));
 scene.traverse(o=>{
  if(!match(o))return;
  const mesh=new T.Mesh(o.geometry,o.material);mesh.matrix.copy(fit).multiply(o.matrixWorld);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);
  mesh.castShadow=mesh.receiveShadow=true;mesh.userData.ownedGeometry=false;mesh.userData.sharedModel=true;mesh.userData.piece=id;mesh.name='Gear '+anchor+' '+id;group.add(mesh);
 });
}
// V44: BOREA's hood, snow mask and collar and the cloth tags went with their kits (archivio/v44-operatori/codice/operator-kits.v43.js).
const KIT_PARTS={
 assalto(P,L,o,side){
  P.model('head','casco_a');if(o.mask)P.model('head','maschera_a');if(o.visor)P.model('head','nvg');
  P.torus('head',L.accent,0,.045,0,.138,.005,[Math.PI/2,0,0],[1,1.12,1]);
  // V43 oR: the body's wear (vest, pouches, pads, marks) is the kit's own cut in operator-wear.js; here only head and pack.
  if(o.pack)P.model('chest','zaino_b');
 },
 sfondamento(P,L,o,side){
  P.model('head','casco_b');P.model('head',o.mask?'antigas':'mezza_maschera');
  if(o.pack)P.model('chest','zaino_a');
 },
 // V44: the whole bodies carry their own armour and helmet; CORVO wears a light pack so it does not read as ASTORE's twin.
 mastino(){},saetta(){},onice(){},astore(){},lince(){},
 corvo(P){P.model('chest','zaino_c');}
};
// Builds the gear groups of one operator configuration: a Map anchor → Group, in world
// coordinates of the rest pose. The caller attaches each to its bone.
export function buildGear(team,operator,anchors){
 const o=cleanOperator(operator),L=operatorLook(team,o.accent),P=new Parts();
 KIT_PARTS[o.kit](P,L,o,anchors.side||1);
 const groups=P.build();
 for(const [anchor,group] of groups){const at=anchors[anchor];if(at)group.position.copy(at);}
 return groups;
}
