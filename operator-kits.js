// V35 operators, V37 photographed gear. Every player picks a kit (silhouette and gear), an
// accent colour and a few toggles; bots get varied kits. The body, its team tint and the
// rig never change. The gear is photographed (Sketchfab CC-BY models, credits in
// assets/CREDITS.md) and fitted around the skeleton's own anchors (head, chest, shoulders)
// in the rest pose; the team's cloth tags and accent trims stay procedural so friend or foe
// reads at a glance: the team tint owns the body, the accent only the trims.
// Materials are shared per team and accent (V34 batching) and per model, never per operator.
import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/addons/libs/meshopt_decoder.module.js';
import {PAINTS} from './weapon-finish.js?v=40.0';
export const KITS=[
 {id:'assalto',name:'ASSALTO',tag:'LINEA',toggles:{visor:'Visore notturno',mask:'Maschera facciale',pack:'Zaino d’assalto'},desc:'Casco balistico con occhiali e cuffia, maschera facciale a scelta, visore notturno a quattro tubi. L’operatore che entra per primo.'},
 {id:'ricognizione',name:'RICOGNIZIONE',tag:'LEGGERO',toggles:{visor:'Occhiali',mask:'Shemagh sul volto',pack:'Zaino leggero'},desc:'Berretto e cuffia radio, shemagh al collo, binocolo al petto. Sagoma bassa, passo lungo.'},
 {id:'sfondamento',name:'SFONDAMENTO',tag:'PESANTE',toggles:{visor:null,mask:'Maschera antigas',pack:'Zaino largo'},desc:'Casco con cuffie integrate, mezza maschera balistica o antigas, zaino largo. Il muro che avanza.'},
 {id:'tiratore',name:'TIRATORE',tag:'OMBRA',toggles:{visor:'Telemetro',mask:'Maschera teschio',pack:'Zaino leggero'},desc:'Passamontagna, telemetro e mantella sulla schiena; a scelta la maschera teschio con occhiali. Visto solo dopo.'}
];
export const DEFAULT_OPERATOR={kit:'assalto',accent:'graphite',visor:0,mask:0,pack:0};
export const kitFor=id=>KITS.find(k=>k.id===id)||null;
export function cleanOperator(v){
 const kit=kitFor(v?.kit)?v.kit:'assalto';
 return {kit,accent:Object.hasOwn(PAINTS,v?.accent)?v.accent:'graphite',visor:v?.visor?1:0,mask:v?.mask?1:0,pack:v?.pack?1:0};
}
// Templates are keyed by the gear generation too: once the photographed models arrive, every
// dressed operator is rebuilt on its next dressOperator call.
let gearGeneration=0;
export const operatorKey=(team,v)=>{const o=cleanOperator(v);return team+':'+o.kit+':'+o.accent+':'+o.visor+o.mask+o.pack+':g'+gearGeneration;};
export const operatorName=v=>kitFor(cleanOperator(v).kit).name;
// Bots wear every kit in turn, with the team's own accent, so a squad reads as a squad.
export function botOperator(serial,team){const kits=KITS.map(k=>k.id);return {kit:kits[Math.abs(serial|0)%kits.length],accent:team==='blue'?'naval':'sand',visor:serial%3===0?1:0,mask:serial%2===1?1:0,pack:serial%4===2?1:0};}
// ---- materials, shared per team and accent -------------------------------------------
const looks=new Map();
export function operatorLook(team,accent){
 const key=team+':'+accent;if(looks.has(key))return looks.get(key);
 const mat=(name,color,roughness,metalness,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness,metalness,...extra});m.name='op-'+name;m.userData.teamLook=true;return m;};
 const blue=team==='blue';
 const look={
  base:mat('base',blue?0x4a5a62:0x6e6248,.9,0),            // gear shell: slate for Vanguard, khaki for Outriders
  cloth:mat('cloth',blue?0x6f9ba9:0xb6855f,1,0),            // team cloth (tags, shemagh, hood)
  rubber:mat('rubber',0x252e2b,.84,0),
  lens:mat('lens',0x263b3c,.3,.15,{envMapIntensity:.5}),
  metal:mat('metal',0x6a7375,.45,.7),
  accent:mat('accent',PAINTS[accent]?.hex||'#45535d',.72,.08)
 };
 looks.set(key,look);return look;
}
// ---- photographed gear ---------------------------------------------------------------
// Each file is loaded once; its meshes are shared by every operator wearing the piece
// (geometry and materials are never disposed with a body). Fits are in metres relative to
// the anchor point, in the rest pose with the operator facing -z, +x the right hand.
// `own` pieces are centred on their own bounds (packs of several objects); the others on
// the whole model's bounds, so pieces of one model keep their authored alignment.
export const GEAR_FILES={
 casco_a:'./assets/models/v37/casco_a.glb',casco_b:'./assets/models/v37/casco_b.glb',casco_c:'./assets/models/v37/casco_c.glb',
 pacco_teste:'./assets/models/v37/pacco_teste.glb',nvg:'./assets/models/v37/nvg.glb',zaino_a:'./assets/models/v37/zaino_a.glb',zaino_b:'./assets/models/v37/zaino_b.glb',
 antigas:'./assets/models/v37/antigas.glb',passamontagna:'./assets/models/v37/passamontagna.glb',cuffie:'./assets/models/v37/cuffie.glb'
};
export const PIECES={
 casco_a:{model:'casco_a',only:/Helmet_Base|Glasses/,fit:{scale:.0062,rotation:[0,Math.PI,0],position:[0,.01,-.01]}},
 maschera_a:{model:'casco_a',only:/Mask/,fit:{scale:.0062,rotation:[0,Math.PI,0],position:[0,.01,-.01]}},
 casco_b:{model:'casco_b',fit:{scale:.3,rotation:[0,Math.PI,0],position:[0,.02,-.01]}},
 casco_c:{model:'casco_c',fit:{scale:.036,rotation:[0,Math.PI,0],position:[0,.04,0]}},
 nvg:{model:'nvg',fit:{scale:.75,rotation:[0,Math.PI,0],position:[0,.035,-.175]}},
 zaino_a:{model:'zaino_a',fit:{scale:.55,rotation:[0,0,0],position:[0,.02,.27]}},
 zaino_b:{model:'zaino_b',fit:{scale:.7,rotation:[0,0,0],position:[0,0,.18]}},
 zaino_c:{model:'zaino_b',fit:{scale:.55,rotation:[0,0,0],position:[0,.02,.17]}},
 antigas:{model:'antigas',fit:{scale:.15,rotation:[0,Math.PI,0],position:[0,-.06,-.12]}},
 passamontagna:{model:'passamontagna',fit:{scale:.13,rotation:[0,Math.PI,0],position:[0,-.02,0]}},
 cuffie:{model:'cuffie',fit:{scale:.27,rotation:[0,Math.PI,0],position:[0,0,0]}},
 shemagh:{model:'pacco_teste',only:/Shemagh/,own:true,fit:{scale:1.05,rotation:[0,Math.PI,0],position:[0,-.1,-.01]}},
 teschio:{model:'pacco_teste',only:/GoustMask/,own:true,fit:{scale:1,rotation:[0,Math.PI,0],position:[0,-.02,0]}},
 mezza_maschera:{model:'pacco_teste',only:/Mask_ballistic/,own:true,fit:{scale:.92,rotation:[0,Math.PI,0],position:[0,-.11,-.03]}}
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
export async function preloadOperatorGear(){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 await Promise.all(Object.entries(GEAR_FILES).map(async([id,file])=>{
  if(gearScenes.has(id))return;
  try{const g=await loader.loadAsync(file);const scene=g.scene;bakeSkins(scene);if(!Object.values(PIECES).some(p=>p.model===id&&p.only))mergeByMaterial(scene);
   scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.userData.teamLook=true;m.userData.operatorGear=true;m.side=T.FrontSide;}o.geometry.computeBoundingBox();});
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
 // A photographed piece: shared meshes of a loaded model placed by its fit.
 model(anchor,id){let g=this.pieces.get(anchor);if(!g){g=[];this.pieces.set(anchor,g);}g.push(id);}
 // One merged mesh per material per anchor for the procedural trims; photographed pieces keep
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
// Team identity on every kit: the two cloth tags on the chest, as the base operator had.
// The suit already carries its own plate, pouches and pads: gear is added only where it
// changes the silhouette (head, back, shoulders) and never over the photographed kit.
function tags(P,L){for(const s of [-1,1])P.box('chest',L.cloth,0,.025,s*.145,.15,.038,.006);}
// Head anchor H = head bone + 10.5 cm ≈ eye level: skull top at H+.10, mouth at H−.06,
// chin at H−.1, neck at H−.17; the bare head is 17 cm wide and 25 cm deep at the eyes.
const KIT_PARTS={
 assalto(P,L,o,side){
  P.model('head','casco_a');if(o.mask)P.model('head','maschera_a');if(o.visor)P.model('head','nvg');
  P.torus('head',L.accent,0,.045,0,.138,.005,[Math.PI/2,0,0],[1,1.12,1]);
  tags(P,L);P.box('chest',L.metal,-.14*side,.13,-.07,.05,.1,.045);P.cyl('chest',L.metal,-.14*side,.21,-.07,.006,.1);P.box('chest',L.accent,.13*side,.12,-.1,.045,.03,.02);
  if(o.pack)P.model('chest','zaino_b');
 },
 ricognizione(P,L,o,side){
  P.model('head','cuffie');
  if(o.mask)P.model('head','shemagh');
  if(o.visor)P.box('head',L.lens,0,.005,-.118,.15,.03,.02);
  tags(P,L);P.box('chest',L.metal,0,.1,-.19,.09,.05,.06);P.cyl('chest',L.metal,-.12*side,.3,.0,.004,.3);
  if(o.pack)P.model('chest','zaino_c');
  P.torus('shoulderL',L.accent,0,-.1,0,.058,.013,[Math.PI/2,0,0]);
 },
 sfondamento(P,L,o,side){
  P.model('head','casco_b');P.model('head',o.mask?'antigas':'mezza_maschera');
  P.box('head',L.accent,0,.15,0,.024,.014,.2);
  tags(P,L);P.box('chest',L.accent,0,.1,-.19,.1,.04,.02);
  if(o.pack)P.model('chest','zaino_a');
  for(const a of ['shoulderL','shoulderR'])P.torus(a,L.accent,0,-.1,0,.058,.012,[Math.PI/2,0,0]);
 },
 tiratore(P,L,o,side){
  P.model('head',o.mask?'teschio':'passamontagna');
  if(o.visor)P.box('head',L.metal,-.05*side,.0,-.125,.03,.03,.05);
  tags(P,L);P.box('chest',L.base,.13*side,-.03,-.17,.07,.1,.05);P.box('chest',L.accent,0,.08,-.18,.07,.03,.01);
  if(o.pack)P.model('chest','zaino_c');
 }
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
