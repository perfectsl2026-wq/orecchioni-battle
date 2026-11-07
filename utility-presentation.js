import {groundHeight} from './shared.js?v=42.0';
import {createWeapon,mergeStatic} from './graphics.js?v=42.0';
import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
// V42: a base rig dropped on the floor: its visible meshes baked into one float mesh per material (the dim world tier of
// the class's light), in the gun's frame at world scale. The rig's GLB meshes are quantised, so they are widened first.
function bakeRig(src){
 const inv=src.matrixWorld.clone().invert(),s=src.userData.worldScale||1,scale=new T.Matrix4().makeScale(s,s,s),m=new T.Matrix4(),groups=new Map(),G=['getX','getY','getZ','getW'];
 src.traverseVisible(o=>{if(!o.isMesh||o.isSkinnedMesh||Array.isArray(o.material)||o.material.isMeshBasicMaterial)return;let g=new T.BufferGeometry();
  for(const [n,a] of Object.entries(o.geometry.attributes)){const f=new Float32Array(a.count*a.itemSize);for(let i=0;i<a.count;i++)for(let k=0;k<a.itemSize;k++)f[i*a.itemSize+k]=a[G[k]](i);g.setAttribute(n,new T.BufferAttribute(f,a.itemSize));}
  if(o.geometry.index)g.setIndex(o.geometry.index.clone());g.applyMatrix4(m.multiplyMatrices(inv,o.matrixWorld).premultiply(scale));
  if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g);});
 const model=new T.Group();for(const [material,list]of groups){const names=Object.keys(list[0].attributes);let same=list.filter(g=>Object.keys(g.attributes).length===names.length&&names.every(n=>g.attributes[n]));if(!same.every(g=>g.index))same=same.map(g=>g.index?g.toNonIndexed():g);const geo=mergeGeometries(same,false);for(const g of list)g.dispose();if(!geo)continue;const mesh=new T.Mesh(geo,material);mesh.name='Drop / '+(material.name||'part');mesh.userData.ownedGeometry=true;model.add(mesh);}
 return model.children.length?model:null;
}
const START_MS=200,ease=x=>x*x*(3-2*x);
export class UtilityPresentation{
 constructor(scene,{dropSource=null,dropLook=null,handOf=null}={}){
  this.scene=scene;this.dropSource=dropSource;this.dropLook=dropLook;this.handOf=handOf;this.grenades=new Map();this.lastStatus='';this.lastBeep=0;
  const metal=new T.MeshStandardMaterial({color:0x96a3a0,metalness:.65,roughness:.46}),dark=new T.MeshStandardMaterial({color:0x253c3d,roughness:.88}),led=new T.MeshBasicMaterial({color:0xe56d42});
  this.flashGeometry=new T.CylinderGeometry(.055,.055,.15,10);this.metal=metal;this.dark=dark;this.smokeCan=new T.MeshStandardMaterial({color:0x5d6b5a,metalness:.35,roughness:.6});this.heShell=new T.MeshStandardMaterial({color:0x3a4a3c,metalness:.5,roughness:.5});this.fireCan=new T.MeshStandardMaterial({color:0x8a2f22,metalness:.4,roughness:.55});this.drops=new Map();this.dropModels=new Map();
  this.bomb=new T.Group();const body=new T.Mesh(new T.BoxGeometry(.34,.16,.24),dark);body.position.y=.10;this.bomb.add(body);
  for(const x of [-.095,0,.095]){const charge=new T.Mesh(new T.CylinderGeometry(.035,.035,.27,10),metal);charge.rotation.x=Math.PI/2;charge.position.set(x,.12,0);this.bomb.add(charge);}
  const display=new T.Mesh(new T.BoxGeometry(.12,.012,.075),new T.MeshBasicMaterial({color:0x668d79}));display.position.set(0,.19,.025);this.bomb.add(display);
  this.led=new T.Mesh(new T.SphereGeometry(.018,8,6),led);this.led.position.set(.14,.18,.08);this.bomb.add(this.led);this.bomb.visible=false;scene.add(this.bomb);
  this.blast=new T.Mesh(new T.SphereGeometry(1,16,10),new T.MeshBasicMaterial({color:0xe2c79b,transparent:true,opacity:0,depthWrite:false}));this.blast.visible=false;scene.add(this.blast);this.blastAt=-Infinity;
  for(const weapon of [1,2,3,4])this.dropModel(weapon);
 }
 // One merged, shadowless model per weapon, built while loading. Every drop shares its geometry and
 // materials, so a drop costs a few draw calls instead of a hundred and nothing is built on the kill frame.
 dropModel(weapon,look=null){
  const id=look?weapon+'|'+look.key:weapon;let model=this.dropModels.get(id);if(model)return model;
  // V42: a class with a modelled design (the OB-510 AVERLA) drops that model: its visible meshes, sharing geometry and
  // the dim world material, in the gun's own frame at world scale. Until the design has loaded the low-poly gun stands in
  // (not cached, so the next drop gets the real one). The base rigs drop their own model, baked (bakeRig).
  // V42 review: a painted weapon drops in its owner's paint. `look` ({finish, key}, from dropLook) is a finish other than
  // the factory one: one model per weapon and finish, built from a rig wearing it; until it can be built the factory drop stands in.
  const src=this.dropSource?.(weapon,look?.finish||null);let ready=true;
  if(src){const parts=[];src.updateMatrixWorld(true);src.traverseVisible(o=>{if(o.isMesh&&(o.userData.variantPart||o.userData.variantMark))parts.push(o);});
   // A design that is the rig's own model (V42 b3: the AVERLA CLASSICO, variant key 'stock') bakes the rig like a base class.
   if(look&&look.finish?.model&&look.finish.model!=='stock'&&src.userData.variantKey!=='stock'&&!parts.some(o=>o.userData.variantPart))ready=false;
   else if(parts.some(o=>o.userData.variantPart)){model=new T.Group();const inv=src.matrixWorld.clone().invert(),s=src.userData.worldScale||1,scale=new T.Matrix4().makeScale(s,s,s);
    for(const o of parts){const m=new T.Mesh(o.geometry,o.material);m.name=o.name;m.matrix.multiplyMatrices(inv,o.matrixWorld).premultiply(scale).decompose(m.position,m.quaternion,m.scale);model.add(m);}}
   else if(src.userData.fxWorld&&src.userData.worldScale){model=bakeRig(src);if(!model)ready=false;}
   else ready=false;}
  if(look&&(!ready||!model))return this.dropModel(weapon);
  if(!model){model=createWeapon(weapon,false);model.userData.flash?.removeFromParent();model.userData={};mergeStatic(model);}
  model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=false;});if(ready)this.dropModels.set(id,model);return model;
 }
 // Build a painted drop ahead of time, off the frame (when the weapon is first seen in that paint), so a kill builds nothing.
 prepareDrop(weapon,look){if(!look||weapon<1||weapon>4||this.dropModels.has(weapon+'|'+look.key)||this.pendingDrops?.has(weapon+'|'+look.key))return;(this.pendingDrops??=new Set()).add(weapon+'|'+look.key);
  const run=()=>{this.pendingDrops.delete(weapon+'|'+look.key);this.dropModel(weapon,look);};typeof requestIdleCallback==='function'?requestIdleCallback(run,{timeout:1500}):setTimeout(run,0);}
 // Copies of everything this class can bring on stage in a match, for the combat warm: the bomb, the blast, thrown cans, drops.
 warmModels(){const g=new T.Group(),bomb=this.bomb.clone(),blast=this.blast.clone();bomb.visible=blast.visible=true;g.add(bomb,blast);for(const m of [this.metal,this.smokeCan,this.heShell,this.fireCan])g.add(new T.Mesh(this.flashGeometry,m));for(const m of this.dropModels.values())g.add(m.clone());return g;}
 update(state,now,dt){
  const live=new Set();for(const g of state.grenades||[]){live.add(g.id);let mesh=this.grenades.get(g.id);if(!mesh){mesh=new T.Mesh(this.flashGeometry,g.kind==='smoke'?this.smokeCan:g.kind==='he'?this.heShell:g.kind==='fire'?this.fireCan:this.metal);mesh.position.set(g.x,g.y,g.z);this.scene.add(mesh);this.grenades.set(g.id,mesh);
    // V43 b34 rev: someone else's can is seen from its first frame, starting at his throwing hand (agent-gear.js), and slides onto
    // the true flight over START_MS: the gap is a few dozen cm, so it never jumps (it was hidden 150 ms, then caught up 1-2 m).
    const age=now-g.born,hand=age>=0&&age<START_MS?this.handOf?.(g.owner):null;mesh.userData.track=new T.Vector3(g.x,g.y,g.z);
    mesh.userData.off=hand&&hand!==true&&Number.isFinite(hand.x)&&hand.distanceToSquared(mesh.position)<1.5?new T.Vector3().subVectors(hand,mesh.position):null;}
   const tr=mesh.userData.track,k=1-Math.exp(-30*dt);tr.x+=(g.x-tr.x)*k;tr.y+=(g.y-tr.y)*k;tr.z+=(g.z-tr.z)*k;mesh.position.copy(tr);
   const off=mesh.userData.off;if(off){const f=1-ease(Math.min(1,Math.max(0,(now-g.born)/START_MS)));if(f>0)mesh.position.addScaledVector(off,f);else mesh.userData.off=null;}mesh.rotation.set(now*.009,0,now*.007);
   // V42: a can just thrown starts at the thrower's eye; the thrower sees it once it is clear of the lens (the hand shows it until then).
   mesh.visible=!this.viewer||mesh.position.distanceToSquared(this.viewer.position)>.8;}
  for(const [id,mesh]of this.grenades)if(!live.has(id)){mesh.removeFromParent();this.grenades.delete(id);}
  // Dropped primaries: the low-poly weapon lying on its side where it fell.
  const drops=new Set();for(const d of state.drops||[]){drops.add(d.id);if(!this.drops.has(d.id)){const m=this.dropModel(d.weapon,this.dropLook?.(d)).clone();m.position.set(d.x,(d.y||0)+.06,d.z);m.rotation.set(0,(d.yaw||0)+.6,Math.PI/2*.92);this.scene.add(m);this.drops.set(d.id,m);}}
  for(const [id,m]of this.drops)if(!drops.has(id)){m.removeFromParent();this.drops.delete(id);}
  const o=state.objective;this.bomb.visible=!!o&&['dropped','planted'].includes(o.status);if(o)this.bomb.position.set(o.x,groundHeight(o.x,o.z),o.z);
  let beep=false,exploded=false;
  if(o?.status==='planted'){const period=Math.max(130,Math.min(1000,(o.explodeAt-now)/35));this.led.visible=now%period<period*.18;if(now-this.lastBeep>=period){this.lastBeep=now;beep=true;}}
  else this.led.visible=true;
  if(o?.status==='exploded'&&this.lastStatus!=='exploded'){this.blast.position.set(o.x,groundHeight(o.x,o.z)+.6,o.z);this.blastAt=now;exploded=true;}
  const age=(now-this.blastAt)/1000;this.blast.visible=age>=0&&age<.65;if(this.blast.visible){this.blast.scale.setScalar(1+age*12);this.blast.material.opacity=(1-age/.65)*.24;}
  this.lastStatus=o?.status||'';return {beep,exploded};
 }
 clear(){for(const mesh of this.grenades.values())mesh.removeFromParent();this.grenades.clear();for(const m of this.drops.values())m.removeFromParent();this.drops.clear();this.bomb.visible=this.blast.visible=false;this.lastStatus='';this.lastBeep=0;this.blastAt=-Infinity;}
}
