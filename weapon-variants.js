// V33 original weapon models. Every class keeps its photographed base model and gains
// original OB designs built here from parts, in the base model's own frame: the grip
// sits where the shooting hand already is, the magazine hangs from the rig's Magazine
// node, the bolt rides the ChargingHandle node and the muzzle socket is moved to the new
// barrel length. Hands, reload and inspection therefore stay exactly as rehearsed.
// The player tunes each design (barrel, furniture, stock, optic; blade curve, length,
// serration, guard, handle) and the result is stored in the finish, so other players
// see it too. Stats never change here: the arbiter reads the class, not the model.
// All designs also carry the maker's mark: a small engraved OB plate.
import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/addons/libs/meshopt_decoder.module.js';
import {WEAPONS} from './shared.js?v=40.0';
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
 4:{grip:[0,.005,.585],support:[0,.11,-.1],muzzle:[0,.054,-1.092],bore:.054,mark:[-.0355,-.03,.43]},
 5:{mark:[0,.0045,-.045]}
};
export const VARIANTS={
 // V36: photographed CC-BY models fitted into the base frames (see CREDITS.md). `fit` is in gun units
 // (twice real size): scale from the model's own units, rotation to put the muzzle on -z, position so the
 // hand's web lands on GripR. `parts` pick the magazine and the moving slide/bolt by node name.
 0:[{id:'titano',name:'OB-50 TITANO',tag:'PISTOLA PESANTE',desc:'Semiautomatica a canna fissa e carrello lungo, cromo satinato e guancette nere. Il peso che si sente.',file:'./assets/models/v36/titano.glb',fit:{scale:.02,rotation:[0,Math.PI,0],position:[0,-.36,-.03]},parts:{mag:/Magazine|BaseInside/i,bolt:/^(Slide_low|Safety|Bolt|RearSight|SlidePart)/i,exclude:/Bullet/i},muzzleDz:-.05,params:[]}],
 1:[{id:'vespa',name:'OB-45 VESPA',tag:'MITRA COMPATTO',desc:'Mitra .45 a polimero con calcio scheletrato e caricatore anteriore: leggero, nervoso, da corridoio.',file:'./assets/models/v36/vespa.glb',fit:{scale:.0029,rotation:[0,Math.PI/2,0],position:[0,-.03,.055]},parts:{magBox:[[85,-110,-22],[140,2,22]]},muzzleDz:0,params:[]},
    {id:'toro',name:'OB-45 TORO',tag:'MITRA PESANTE',desc:'Mitra .45 a castello basso e calcio pieno, con torcia e maniglia d’armamento laterale. Pieno in mano.',file:'./assets/models/v36/toro.glb',fit:{scale:.0508,rotation:[0,Math.PI,0],position:[0,.045,-.3]},parts:{mag:/mag_low/i,bolt:/^handle_low/i},muzzleDz:.03,params:[toggle('light','Torcia',/light_low/i)]}],
 2:[{id:'scirocco',name:'OB-7 SCIROCCO',tag:'CARABINA 7,62 COMPATTA',desc:'Carabina corta con slitta superiore, astina a feritoie e silenziatore PBS. Il colpo grosso, accorciato.',file:'./assets/models/v36/scirocco.glb',fit:{scale:.02,rotation:[0,Math.PI,0],position:[0,-.216,-.157]},parts:{mag:/mag_low|mag_cap/i,bolt:/bolt_carrier/i},muzzleDz:0,params:[toggle('pbs','Silenziatore',/PBS/i)]}],
 3:[{id:'levante',name:'OB-5 LEVANTE',tag:'CARABINA SILENZIATA',desc:'Carabina 5,56 a silenziatore integrale, astina corta e puntatore laterale. Pulita, precisa, da difesa.',file:'./assets/models/v36/levante.glb',fit:{scale:.011,rotation:[0,-Math.PI/2,0],position:[0,.056,.056]},parts:{mag:/mag_low/i,exclude:/laser_light/i},muzzleDz:-.03,params:[toggle('laser','Puntatore laser',/laser_low|side_rail/i)]}],
 4:[],
 5:[{id:'artiglio',name:'ARTIGLIO',tag:'LAMA CURVA',desc:'Coltello ad artiglio con anello al pomolo, acciaio nero satinato.',file:'./assets/models/v36/artiglio.glb',fit:{scale:.00055,rotation:[0,0,-Math.PI/2],position:[0,0,-.019]},parts:{},params:[]},
    {id:'farfalla',name:'FARFALLA',tag:'BALISONG',desc:'Coltello a farfalla in acciaio e ottone, lama a clip.',file:'./assets/models/v36/farfalla.glb',fit:{scale:.21,rotation:[3.0415,.7482,2.6867],position:[0,0,-.055]},parts:{},params:[]},
    {id:'bowie',name:'BOWIE OB',tag:'DA CAMPO',desc:'Lama larga vissuta, guardia d’ottone e manico in cuoio.',file:'./assets/models/v36/bowie.glb',fit:{scale:.0072,rotation:[0,0,-Math.PI/2],position:[0,0,.06]},parts:{},params:[]}]
};
export const variantFor=(index,id)=>(VARIANTS[index]||[]).find(v=>v.id===id)||null;
// Parameters clamped to their definitions; unknown keys dropped. `null` means the base model.
export function cleanBuild(index,id,build){
 const v=variantFor(index,id);if(!v)return null;const out={};
 for(const p of v.params){const raw=build?.[p.key];if(p.type==='range'){const n=Number(raw);out[p.key]=Number.isFinite(n)?Math.round(Math.min(p.max,Math.max(p.min,n))/p.step)*p.step:p.def;out[p.key]=+out[p.key].toFixed(2);}else{const n=Number(raw);out[p.key]=Number.isInteger(n)&&n>=0&&n<p.options.length?n:p.def;}}
 return out;
}
export const displayName=(index,finish)=>variantFor(index,finish?.model)?.name||WEAPONS[index]?.name||'Arma';
export const variantKey=(index,finish)=>{const v=variantFor(index,finish?.model);return v?v.id+JSON.stringify(cleanBuild(index,v.id,finish?.build)):'stock';};
// Materials for the warm-up set (the photographed models bring their own).
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
// ---- photographed models (V36) ----------------------------------------------------------------
// A design may be a GLB instead of parts: a CC-BY model fitted into the base gun's frame by
// `fit` (scale, Euler rotation, position in gun units), with its magazine and bolt meshes
// picked by name so the rig's reload moves them. Files load once and are shared; a root asked
// to wear a model that is still loading keeps the base gun until the file arrives.
const modelLoader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),modelCache=new Map(),modelPending=new Map();
function loadModel(file){
 if(modelCache.has(file))return modelCache.get(file);
 const entry={scene:null,error:null};modelCache.set(file,entry);
 modelLoader.loadAsync(file).then(g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of [].concat(o.material))if(m){m.envMapIntensity=.7;for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key])m[key].anisotropy=8;}}});entry.scene=g.scene;
  for(const job of modelPending.get(file)||[])job();modelPending.delete(file);}).catch(e=>{entry.error=e;console.error('Modello non caricato',file,e);modelPending.delete(file);});
 return entry;
}
function modelGroups(variant,root,build){
 const entry=loadModel(variant.file);if(!entry.scene)return null;const hidden=(variant.params||[]).filter(p=>p.hides&&build?.[p.key]===1).map(p=>p.hides);
 const fit=variant.fit||{},q=new T.Quaternion().setFromEuler(new T.Euler(...(fit.rotation||[0,0,0]))),s=fit.scale||1,pos=new T.Vector3(...(fit.position||[0,0,0]));
 const place=g=>{g.quaternion.copy(q);g.scale.setScalar(s);g.position.copy(pos);g.userData.variantPart=true;return g;};
 const groups={body:place(new T.Group()),mag:place(new T.Group()),bolt:place(new T.Group())};groups.body.name='Variant / body';groups.mag.name='Variant / mag';groups.bolt.name='Variant / bolt';
 const parts=variant.parts||{};entry.scene.updateMatrixWorld(true);
 // Monolithic models: triangles inside `parts.magBox` (model units) become the magazine so the reload can move it.
 const split=(geo,box,world)=>{const src=geo.index?geo.toNonIndexed():geo,pos=src.attributes.position,names=Object.keys(src.attributes),v=new T.Vector3(),inside=i=>{v.fromBufferAttribute(pos,i).applyMatrix4(world);return v.x>=box[0][0]&&v.x<=box[1][0]&&v.y>=box[0][1]&&v.y<=box[1][1]&&v.z>=box[0][2]&&v.z<=box[1][2];};
  // A triangle belongs to the magazine when its centroid is in the box: magazine sides are long quads that reach the receiver.
  const c=new T.Vector3(),centroidIn=t=>{c.set(0,0,0);for(let k=0;k<3;k++)c.add(v.fromBufferAttribute(pos,t+k).applyMatrix4(world));c.multiplyScalar(1/3);return c.x>=box[0][0]&&c.x<=box[1][0]&&c.y>=box[0][1]&&c.y<=box[1][1]&&c.z>=box[0][2]&&c.z<=box[1][2];};
  const keep=[[],[]];for(let t=0;t<pos.count;t+=3)keep[centroidIn(t)?1:0].push(t);
  const pick=list=>{if(!list.length)return null;const out=new T.BufferGeometry();for(const n of names){const a=src.attributes[n],arr=new a.array.constructor(list.length*3*a.itemSize);let k=0;for(const t of list)for(let v=0;v<3;v++)for(let c=0;c<a.itemSize;c++)arr[k++]=a.array[(t+v)*a.itemSize+c];out.setAttribute(n,new T.BufferAttribute(arr,a.itemSize,a.normalized));}out.computeBoundingSphere();return out;};
  return {body:pick(keep[0]),mag:pick(keep[1])};};
 entry.splits??=new Map();
 entry.scene.traverse(o=>{if(!o.isMesh)return;
  if(parts.magBox){const key=o.uuid;if(!entry.splits.has(key))entry.splits.set(key,split(o.geometry,parts.magBox,o.matrixWorld));const sp=entry.splits.get(key);for(const [role,geo] of Object.entries(sp)){if(!geo)continue;const mesh=new T.Mesh(geo,o.material);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.variantPart=true;mesh.userData.sharedModel=true;mesh.name=o.name+'/'+role;mesh.matrix.copy(o.matrixWorld);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);groups[role].add(mesh);}return;}
  const mesh=new T.Mesh(o.geometry,o.material);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.variantPart=true;mesh.userData.sharedModel=true;mesh.name=o.name;mesh.matrix.copy(o.matrixWorld);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);
  const label=[o.name,o.parent?.name,o.parent?.parent?.name].filter(Boolean).join(' ')+' '+[].concat(o.material).map(m=>m?.name||'').join(' ');if(parts.exclude&&parts.exclude.test(label))return;if(hidden.some(rx=>rx.test(label)))return;const target=parts.mag&&parts.mag.test(label)?'mag':parts.bolt&&parts.bolt.test(label)?'bolt':'body';groups[target].add(mesh);});
 for(const key of Object.keys(groups))if(!groups[key].children.length)delete groups[key];
 return {groups,muzzleDz:variant.muzzleDz||0};
}
// ---- apply ---------------------------------------------------------------------------------
// Builds or swaps the model on a weapon root (a rig's Gun_* node, a display gun or the knife).
export function applyVariant(root,index,finish){
 if(!root)return;if(!root.userData.variantMark){root.userData.variantMark=true;addMark(root,index);}
 const variant=variantFor(index,finish?.model),key=variantKey(index,finish);
 if(root.userData.variantKey===key){syncKits(root,key!=='stock');return;}
 root.userData.variantKey=key;
 const old=[];root.traverse(o=>{if(o.userData.variantPart&&!o.parent?.userData.variantPart)old.push(o);});
 for(const o of old){o.removeFromParent();o.traverse(x=>{if(x.isMesh&&!x.userData.sharedModel){x.geometry.dispose();for(const mat of [].concat(x.material))mat.dispose?.();}});}
 const stock=key==='stock';const kits=new Set();for(const [,group] of root.userData.cosmeticKits||[])group.traverse(o=>kits.add(o));
 root.traverse(o=>{if(!o.isMesh||o.userData.variantPart||o.userData.variantMark||kits.has(o)||o.material?.isMeshBasicMaterial)return;o.visible=stock;});
 const socket=root.getObjectByName('MuzzleSocket');if(socket){socket.userData.restZ??=socket.position.z;socket.position.z=socket.userData.restZ;}
 syncKits(root,!stock);if(stock)return;
 const build=cleanBuild(index,variant.id,finish?.build);
 const built=modelGroups(variant,root,build);
 if(!built){root.userData.variantKey=null;root.traverse(o=>{if(!o.isMesh||o.userData.variantPart||o.userData.variantMark||kits.has(o)||o.material?.isMeshBasicMaterial)return;o.visible=true;});syncKits(root,false);
  if(!modelCache.get(variant.file)?.error){if(!modelPending.has(variant.file))modelPending.set(variant.file,[]);modelPending.get(variant.file).push(()=>applyVariant(root,index,finish));}return;}
 const {groups,muzzleDz}=built;
 root.updateMatrixWorld(true);
 for(const [name,g]of Object.entries(groups)){root.add(g);const node=name==='mag'?root.getObjectByName('Magazine'):name==='bolt'?root.getObjectByName('ChargingHandle'):null;if(node&&node!==root){g.updateMatrixWorld(true);node.attach(g);}}
 if(socket&&muzzleDz)socket.position.z=socket.userData.restZ+muzzleDz;
}
// Cosmetic kits belong to the base model: an original design brings its own furniture.
function syncKits(root,hide){for(const [,group] of root.userData.cosmeticKits||[])group.userData.kitHidden=hide;if(hide)for(const [,group] of root.userData.cosmeticKits||[])group.visible=false;}
// Compiles the plain OB materials once so the first original weapon seen mid-match links no shader.
export function warmVariantMaterials(){const m=palette();const g=new T.Group();for(const mat of Object.values(m)){const mesh=new T.Mesh(new T.BoxGeometry(.01,.01,.01),mat);mesh.frustumCulled=false;g.add(mesh);}const map=markMap();if(map){const mm=new T.MeshStandardMaterial({map,roughness:.42,metalness:.6});g.add(new T.Mesh(new T.PlaneGeometry(.01,.01),mm));}return g;}
