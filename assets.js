import {inspectionPose,reloadPose} from './weapon-inspection.js?v=42.0';
import {STANCE,RUN_SINK} from './player-feel.js?v=42.0';
import {readableAlbedo} from './surface-detail.js?v=42.0';
import {prepareKits} from './weapon-kits.js?v=42.0';
import {createKnife} from './knife.js?v=42.0';
import {shapeArms,wrapFingers,twistRig,untwist,addCuffs,ARM_SHAPE,palmOf} from './viewmodel-arms.js?v=42.0';
import {ensureNodes,baseVariant,applyVariant,classicLook,holdFor,fpSupportShift} from './weapon-variants.js?v=42.0';
import {dressRig} from './weapon-fx.js?v=42.0';
import {buildGear,operatorKey,DEFAULT_OPERATOR,preloadOperatorGear,headScale,KITS,BODIES,cleanOperator as cleanOperatorLook} from './operator-kits.js?v=42.0';
import {PAINTS} from './weapon-finish.js?v=42.0';
import {WEAR_KITS,wearGeometry,wearLook,wearSuitLook,wearSuitGeometry,wearHeadLook,glovesOnly,skinPart} from './operator-wear.js?v=42.0';
const cleanMask=o=>!!cleanOperatorLook(o).mask;
import {footPlants} from './agent-locomotion.js?v=42.0';
import {dressAgentGear,throwPhase,heldCan} from './agent-gear.js?v=42.0';
import * as THREE from './vendor/three.module.js';
import {locomotionWeights,gaitDirection} from './agent-motion.js?v=42.0';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/addons/libs/meshopt_decoder.module.js';
import {clone as cloneSkeleton} from './vendor/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
// The muzzle end of a weapon model: most carry a MuzzleSocket, the OB-310 names its tip MuzzleDeviceTip.
export const muzzleOf=root=>root.getObjectByName('MuzzleSocket')||root.getObjectByName('MuzzleDeviceTip');
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),loaded=new Map();
const files=['smeriglio','assillo','roncola','tarlo','averla','soldier_tac'];
export async function preloadAssets(progress){let done=0;const total=files.length+1;const r=await Promise.allSettled([...files.map(async name=>{const g=await loader.loadAsync('./assets/models/v4/'+name+'.glb');loaded.set(name,g);progress?.(++done,total)}),preloadOperatorGear().then(()=>progress?.(++done,total))]);for(const v of r)if(v.status==='rejected')console.error('Asset non caricato',v.reason);return r.filter(v=>v.status==='rejected').length;}
// First-person sleeves and gloves: the shared 1024 px texture is stretched over the
// whole forearm and reads as smeared leather. A fine twill weave, tiled 40 times over
// the UVs, and a less yellow, slightly desaturated tint make it read as uniform fabric.
let weave=null;
function weaveTexture(){
 if(weave)return weave;const n=64,data=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const warp=Math.abs(Math.sin(Math.PI*(x+.5)/4)),weft=Math.abs(Math.sin(Math.PI*(y+.5)/4)),over=(((x>>2)+(y>>2))&1)===0,k=(y*n+x)*4;
  const v=Math.round(255*(.58+.42*(over?warp*(.75+.25*weft):weft*(.75+.25*warp))));data[k]=data[k+1]=data[k+2]=v;data[k+3]=255;}
 weave=new THREE.DataTexture(data,n,n);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.magFilter=THREE.LinearFilter;weave.minFilter=THREE.LinearMipmapLinearFilter;weave.generateMipmaps=true;weave.anisotropy=8;weave.needsUpdate=true;return weave;
}
function fabricArms(m){
 const map=weaveTexture();m.customProgramCacheKey=()=>'fabric-arms-v30';
 m.onBeforeCompile=shader=>{shader.uniforms.uWeave={value:map};
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uWeave;').replace('#include <map_fragment>',`#include <map_fragment>
  #ifdef USE_MAP
  float weaveV=texture2D(uWeave,vMapUv*40.).r;float lum=dot(diffuseColor.rgb,vec3(.299,.587,.114));
  diffuseColor.rgb=mix(vec3(lum),diffuseColor.rgb,.62)*vec3(.94,1.,.9)*(.78+.42*weaveV);
  #endif`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n  #ifdef USE_MAP\n  roughnessFactor=clamp(roughnessFactor+.08-.16*texture2D(uWeave,vMapUv*40.).r,.0,1.);\n  #endif');};
}
// Skinned casters keep their own depth material, so the shared one stops switching variant between bodies and walls.
const skinDepth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
function tune(model,materials=new Map()){
 model.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;o.castShadow=o.receiveShadow=true;
  // Skinned and rigid users of one source material get a clone each: sharing flips the program on every draw.
  const original=o.material,looks=o.isSkinnedMesh?materials:(materials.rigid??=new Map());if(!looks.has(original))looks.set(original,original.clone());o.material=looks.get(original);if(o.isSkinnedMesh)o.customDepthMaterial=skinDepth;
  const m=o.material;m.envMapIntensity=.7;
  for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key])m[key].anisotropy=16;
  if(m.name==='arms'){m.roughness=.94;m.metalness=0;m.normalScale?.set(.5,.5);fabricArms(m);}
  if(/Mil_Suit|GreenCap|HeadphonesT/.test(m.name)){
   m.metalness=/Plate/.test(m.name)?.06:0;m.roughness=/Head/.test(m.name)?.88:.92;
   m.envMapIntensity=.35;m.normalScale?.set(.65,.65);
   // Cloth and pouches were incorrectly authored as full metal.
   if(/Mil_Suit/.test(m.name))m.metalnessMap=null;
  }
 });return model;
}
function rig(index){
 const g=loaded.get(files[index]);if(!g)return null;const model=tune(cloneSkeleton(g.scene)),seen=new Set();
 // This disconnected export helper is not the working, animated magazine.
 if(index===2)model.getObjectByName('SpareMagazine')?.removeFromParent();
 model.traverse(o=>{if(!o.isMesh)return;for(const mat of Array.isArray(o.material)?o.material:[o.material]){
  if(seen.has(mat)||mat.name==='arms')continue;seen.add(mat);
  // A material can be shared by many screws/panels. Tint it exactly once:
  // repeated multiplication made the original sniper nearly black.
  if(index===4){
   if(/^Body/.test(mat.name)){mat.color.set(0x78836d);mat.roughness=.83;mat.metalness=.05;mat.normalScale?.set(.26,.26);readableAlbedo(mat,{contrast:.88,lift:.025});}
   else if(/Scope|Gun_Metal|Zinc|Screw|Metal_Stratched/.test(mat.name)){const scope=/Scope/.test(mat.name),bright=/Screw|Zinc/.test(mat.name);mat.color.set(scope?0x2f373a:bright?0x7d8a88:0x363f43);mat.roughness=scope?.62:bright?.48:.4;mat.metalness=scope?.5:.82;mat.envMapIntensity=scope?.5:.75;mat.normalScale?.set(.35,.35);}
   else if(/glass/i.test(mat.name)){mat.color.set(0x183b40);mat.roughness=.14;mat.metalness=.5;mat.envMapIntensity=1.2;}
  }else if(index===0||index===3)mat.color.multiplyScalar(index===0?.72:.70);
 }});return model;
}
// `world`: a weapon seen in the arena (other players, drops, bodies), which wears the dim tier of a design's light.
export function createDisplayWeapon(index,world=false){
 if(index===5){const knife=createKnife();if(world)knife.userData.fxWorld=true;dressRig(knife,5,world);prepareKits(knife,index);return knife;}
 const m=rig(index);if(!m)return null;m.updateMatrixWorld(true);const gun=m.getObjectByName('Gun_'+files[index]);if(!gun)return null;
 const marker=name=>{const o=m.getObjectByName(name);return o?gun.worldToLocal(o.getWorldPosition(new THREE.Vector3())):null;};
 gun.userData.support=marker('GripL');if(gun.userData.support){gun.userData.support.x-=.16;gun.userData.support.y-=.10;if([2,4].includes(index))gun.userData.support.z+=.08;}gun.userData.trigger=marker('GripR')||new THREE.Vector3(0,.012,.295);
 // V42 OB-510 AVERLA: the support hand goes to its forward grip (same wrist offset from the palm as above).
 if(index===4&&baseVariant(4)&&gun.userData.support)gun.userData.support.set(-.16,-.16,.02);
 gun.userData.hold=holdFor(index,null);gun.removeFromParent();gun.scale.multiplyScalar(.5);gun.userData.worldScale=gun.scale.x;
 if(world)gun.userData.fxWorld=true;dressRig(gun,baseVariant(index)?classicLook(index):index,world);ensureNodes(gun,index);prepareKits(gun,index);if(baseVariant(index))applyVariant(gun,index,null);return gun;
}
// V42 smoke canister for the throw, held in the knife rig's hand: body, tinted cap, spoon and ring
// pin. Built with the inventory rigs, visible until their programs are linked at load.
function createCanister(){
 const g=new THREE.Group(),body=new THREE.MeshStandardMaterial({color:0x56624f,metalness:.35,roughness:.55}),cap=new THREE.MeshStandardMaterial({color:0xb6bab4,metalness:.2,roughness:.6}),steel=new THREE.MeshStandardMaterial({color:0xa4acaf,metalness:.8,roughness:.32});
 const part=(geometry,material,x,y,z)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.userData.ownedGeometry=true;g.add(m);return m;};
 part(new THREE.CylinderGeometry(.028,.028,.105,18),body,0,0,0);part(new THREE.CylinderGeometry(.0285,.0285,.016,18),cap,0,.06,0);part(new THREE.CylinderGeometry(.011,.013,.02,10),steel,0,.078,0);
 const lever=part(new THREE.BoxGeometry(.011,.085,.005),steel,0,.035,.031);lever.rotation.x=-.1;
 const ring=part(new THREE.TorusGeometry(.013,.0024,6,18),steel,-.022,.08,0);ring.rotation.y=Math.PI/2;
 g.userData={cap,ring,ringRest:ring.position.clone(),lever};return g;
}
export function createArmedModel(index,bare=false){
 if(index===5){
  const root=createArmedModel(0,true);if(!root)return null;const d=root.userData,old=d.gun;root.updateMatrixWorld(true);
  const grip=root.getObjectByName('GripR'),point=grip?.getWorldPosition(new THREE.Vector3())||old.getWorldPosition(new THREE.Vector3());
  old.visible=false;d.flash.visible=false;d.mag=null;d.bolt=null;d.index=5;d.knife=createKnife();dressRig(d.knife,5,false);prepareKits(d.knife,5);d.knife.rotation.x=.52;d.knife.position.copy(root.worldToLocal(point));root.add(d.knife);
  // V44: the fingers close on the handle (the pistol rig's hand was left open round a grip that is not there).
  // V44 review 2: the rig is shared with the smoke canister (28 mm across, the handle 12.5): the closed fist put a finger
 // through the canister, so the hand keeps both poses and takes the open one (as authored) while the canister is held,
 // and opens toward it in the air of the inspection toss to catch the blade.
 root.updateMatrixWorld(true);{const bones=[];d.model.traverse(o=>{if(/^Bone_R0(0[5-9]|1\d|2[0-2])$/.test(o.name))bones.push(o);});const open=bones.map(b=>b.quaternion.clone());
  const a=d.knife.localToWorld(new THREE.Vector3(0,0,-.01)),b=d.knife.localToWorld(new THREE.Vector3(0,0,.09));wrapFingers(d.model,'R',a,b.sub(a),.0125,{thumb:true,pad:.006,open:.4});d.knifeFingers={bones,open,closed:bones.map(b=>b.quaternion.clone()),now:0};}
 d.knifeGrip=grip;d.canister=createCanister();d.canister.position.copy(d.knife.position);root.add(d.canister);d.hip.add(new THREE.Vector3(.025,-.015,-.025));return root;
 }
 const model=rig(index);if(!model)return null;
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.add(model);model.scale.setScalar(.5);shapeArms(model,index===0?PISTOL_ARMS:ARM_SHAPE);addCuffs(model);
 // V44: the support hand's hold, per rig: the AVERLA's forward grip, the classic AVERLA's fore-end, the pistol's two-hand wrap.
 const S0=index===4?(classicSniper?SUPPORT_4C:SUPPORT_4):index===0&&!bare?SUPPORT_0:null;
 const data=JSON.parse(model.children[0]?.userData.fp||'{}');
 // Authored grip and wrist pose, positioned in camera space at real-world scale.
 const hip=data.hip||{pos:[.068,.144,-.052],boreRef:[0,-.1475,.055]},r=hip.boreRef;
 root.userData.hip=new THREE.Vector3(hip.pos[0]-r[0],hip.pos[2]-r[2],-hip.pos[1]+r[1]);
 root.userData.classic=index===4&&classicSniper;if(!S0&&SEAT[index])root.userData.seat=SEAT[index];if(S0?.hip)root.userData.hip.set(...(touchView&&S0.touch?.hip||S0.hip));
 const gun=model.getObjectByName('Gun_'+files[index]);dressRig(gun,baseVariant(index)?classicLook(index):index,false);ensureNodes(gun,index);const socket=muzzleOf(model);
 const flash=new THREE.Group();const f=new THREE.Mesh(new THREE.ConeGeometry(.025,.12,6),new THREE.MeshBasicMaterial({color:0xffdab0,transparent:true,opacity:.9,depthWrite:false}));f.rotation.x=-Math.PI/2;f.position.z=-.04;flash.add(f);if(socket)socket.add(flash);else gun.add(flash);flash.visible=false;
 const mag=model.getObjectByName('Magazine'),bolt=model.getObjectByName('ChargingHandle');
 const leftHand=model.getObjectByName('Hand_L'),joints=['Forearm_L','UpArm_L'].map(n=>model.getObjectByName(n)).filter(Boolean);
 const leftAnchor=model.getObjectByName('Arm_L'),leftAnchorRest=leftAnchor?.position.clone();const rest=joints.map(n=>n.quaternion.clone());const leftRest=leftHand?.quaternion.clone();
 const rightHand=model.getObjectByName('Hand_R'),rightAnchor=model.getObjectByName('Arm_R'),rightJoints=['Forearm_R','UpArm_R'].map(n=>model.getObjectByName(n)).filter(Boolean);
 const fpLeft={leftHand,leftAnchor,leftAnchorRest,joints,rest,leftRest,twist:twistRig(model,'L')};
 const fpRight={leftHand:rightHand,leftAnchor:rightAnchor,leftAnchorRest:rightAnchor?.position.clone(),joints:rightJoints,rest:rightJoints.map(n=>n.quaternion.clone()),leftRest:rightHand?.quaternion.clone(),twist:twistRig(model,'R')};
 root.userData={...root.userData,fpRight,body,model,gun,flash,index,mag,magRest:mag?.position.clone(),bolt,boltRest:bolt?.position.clone(),boltRestQ:bolt?.quaternion.clone(),fpScratch:Array.from({length:8},()=>new THREE.Vector3()),leftHand,joints,rest,leftRest,leftAnchor,leftAnchorRest,reloadStart:0,wasReload:false};prepareKits(gun,index);root.userData.fpArms=[fpLeft,fpRight];root.updateMatrixWorld(true);// Rest landmarks for the V32 rig: grip pivot, hand bones, forearm wrist points and the
 // support hand's offset from its fore-end grip, all in the rig's own (rest) frame.
 const at=n=>{const o=model.getObjectByName(n);return o?root.worldToLocal(o.getWorldPosition(new THREE.Vector3())):null;},d=root.userData;
 d.pivot=at('GripR');d.gunRest={position:gun.position.clone(),quaternion:gun.quaternion.clone(),scale:gun.scale.clone()};
 d.magSocket=model.getObjectByName('MagazineGripSocket')||model.getObjectByName('MagazineGrip')||mag;d.port=model.getObjectByName('EjectionPort');
 // V42 OB-510 AVERLA: its ejection port (gun units), where the case leaves and the reload hand works.
 if(index===4){const port=new THREE.Object3D();port.name='EjectionPort / AVERLA';port.position.set(.0394,.0838,.3191);gun.add(port);d.port=port;}
 // Palm point: between the wrist and the fingertips of the support hand at rest.
 if(leftHand){const wrist=root.worldToLocal(leftHand.getWorldPosition(new THREE.Vector3())),tips=[];leftHand.traverse(o=>{if(/^Bone_L.?0(07|11|15)/.test(o.name)&&/end/.test(o.name))tips.push(root.worldToLocal(o.getWorldPosition(new THREE.Vector3())));});
  const palm=(tips.length?tips.reduce((a,b)=>a.add(b),new THREE.Vector3()).multiplyScalar(1/tips.length).lerp(wrist,.45):wrist.clone());d.gripOffset=wrist.clone().sub(palm);}
 for(const arm of d.fpArms)if(arm.leftHand&&arm.joints.length===2){arm.handPosRest=arm.leftHand.position.clone();arm.wristLocal=arm.joints[0].worldToLocal(arm.leftHand.getWorldPosition(new THREE.Vector3()));}
 // V42: the OB-510 AVERLA is held by its forward grip. The support hand's rest is moved and turned so its palm lands on
 // the grip, in the gun's own frame; the rig solves the arm to it every frame (shoulder and forearm in animateViewmodel).
 if(S0&&leftHand&&d.gripOffset){const S=d.support4={...S0,...(touchView?S0.touch:{})},restPos=leftHand.position.clone(),restQ=fpLeft.leftRest.clone(),offset0=d.gripOffset.clone();
  // The turn takes the hand's own frame (index-to-little-finger knuckle line, knuckles forward of the wrist) onto the
  // grip: knuckle line down the grip's axis, palm toward it, so the fingers close round it from the left.
  const bone=n=>model.getObjectByName(n)?.getWorldPosition(new THREE.Vector3());
  d.fitSupport=()=>{leftHand.position.copy(restPos);leftHand.quaternion.copy(restQ);root.updateMatrixWorld(true);const gq=gun.getWorldQuaternion(new THREE.Quaternion());
   const k=['Bone_L005','Bone_L009','Bone_L013','Bone_L017'].map(bone),w=leftHand.getWorldPosition(new THREE.Vector3());let turn=new THREE.Quaternion();
   if(k.every(Boolean)){const basis=(f,m)=>{f.normalize();m.addScaledVector(f,-m.dot(f)).normalize();return new THREE.Matrix4().makeBasis(f,m,new THREE.Vector3().crossVectors(f,m));};
    const now=basis(k[3].clone().sub(k[0]),k[0].clone().add(k[1]).add(k[2]).add(k[3]).multiplyScalar(.25).sub(w));
    const f=new THREE.Vector3(...S.axis).applyQuaternion(gq).normalize(),n=new THREE.Vector3(...S.palm).applyQuaternion(gq);n.addScaledVector(f,-n.dot(f)).normalize();
    const goal=basis(f,new THREE.Vector3().crossVectors(n,f));turn.setFromRotationMatrix(goal.multiply(now.transpose()));}
   turn.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...S.turn,'YXZ')));
   const hq=leftHand.getWorldQuaternion(new THREE.Quaternion()).premultiply(turn),palm=root.worldToLocal(gun.localToWorld(new THREE.Vector3(...S.at)));leftHand.quaternion.copy(leftHand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(hq));
   const offset=offset0.clone().applyQuaternion(turn);leftHand.position.copy(leftHand.parent.worldToLocal(root.localToWorld(palm.add(offset))));leftHand.updateMatrixWorld(true);
   fpLeft.leftRest=d.leftRest=leftHand.quaternion.clone();fpLeft.handPosRest=leftHand.position.clone();d.gripOffset=offset;fpLeft.fitted=false;};
  // V44: holds that keep the old reload and inspection work (pistol, classic AVERLA) reach the parts with the hand turned
  // as it was authored, not as it now rests on the grip.
  if(S.keepWork){fpLeft.workRest=root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(leftHand.getWorldQuaternion(new THREE.Quaternion()));d.workOffset=offset0.clone();}
  d.fitSupport();seatShoulder(root,d,S);
  if(S.wrap){root.updateMatrixWorld(true);const [p,a,r]=S.wrap,g=gun.localToWorld(new THREE.Vector3(...p)),dir=gun.localToWorld(new THREE.Vector3(...p).add(new THREE.Vector3(...a))).sub(g);wrapFingers(model,'L',g,dir,r*gun.getWorldScale(new THREE.Vector3()).x,{open:.3});}}
  if(d.seat&&leftHand&&leftAnchor)seatShoulder(root,d,d.seat);
 // V44 review: the SMG rig's support hand (ASSILLO, TAFANO, CICALA) pointed its thumb and index straight along the
 // fore-end; the fingers and thumb now close round it (a cylinder about the bore at the palm's height, 80 % of its reach).
 if(index===1&&leftHand){root.updateMatrixWorld(true);const palm=palmOf(leftHand,'L'),gl=gun.worldToLocal(palm.clone()),c=gun.localToWorld(new THREE.Vector3(0,gl.y,gl.z)),ax=gun.localToWorld(new THREE.Vector3(0,gl.y,gl.z+1)).sub(c);wrapFingers(model,'L',c,ax,c.distanceTo(palm)*.8,{thumb:true,open:.1});}
 // V44: the trigger hand's fingers close round the pistol grip (they stood open in front of it).
 if(index===0&&!bare&&SUPPORT_0.grip){root.updateMatrixWorld(true);const [p,a,r]=SUPPORT_0.grip,g=gun.localToWorld(new THREE.Vector3(...p)),dir=gun.localToWorld(new THREE.Vector3(...p).add(new THREE.Vector3(...a))).sub(g);wrapFingers(model,'R',g,dir,r*gun.getWorldScale(new THREE.Vector3()).x,{fingers:[1,2,3],open:.2});}
 return root;
}
// Fixed scratch storage avoids allocating vectors/quaternions on every arm/leg
// solve (four solves per visible operator per rendered frame).
const ikV=Array.from({length:9},()=>new THREE.Vector3()),ikQ=Array.from({length:5},()=>new THREE.Quaternion());
// V34: reads of a world matrix the caller has just brought up to date. getWorld*()
// recomputes every ancestor first (18 levels on average for an operator bone), which
// gave the same numbers at many times the cost; decompose() is its final step.
const freshP=new THREE.Vector3(),freshS=new THREE.Vector3(),freshQ=new THREE.Quaternion();
const freshQuaternion=(o,q)=>{o.matrixWorld.decompose(freshP,q,freshS);return q;};
const freshPosition=(o,v)=>v.setFromMatrixPosition(o.matrixWorld);
const freshScale=(o,v)=>{o.matrixWorld.decompose(freshP,freshQ,v);return v;};
// With `fresh` the limb and all its ancestors already carry current world matrices
// (animateAgent poses the skeleton in hierarchy order), and only the chain read
// afterwards is updated; the joint rotations are the same as the general solve.
function rotateJoint(joint,from,to,fresh=false){const q=ikQ[1].setFromUnitVectors(from.normalize(),to.normalize()),parent=fresh?freshQuaternion(joint.parent,ikQ[2]):joint.parent.getWorldQuaternion(ikQ[2]);joint.quaternion.premultiply(ikQ[3].copy(parent).invert().multiply(q).multiply(parent));joint.updateWorldMatrix(false,!fresh);}
function solveHand(d,target,poleDirection,fresh=false){
 if(!d.leftHand||d.joints.length!==2)return;
 const [fore,upper]=d.joints;fresh&&=d.leftHand.parent===fore&&fore.parent===upper;
 const orientation=fresh?freshQuaternion(d.leftHand,ikQ[0]):d.leftHand.getWorldQuaternion(ikQ[0]);if(!fresh)upper.updateWorldMatrix(true,true);
 const position=fresh?freshPosition:(o,v)=>o.getWorldPosition(v);
 const shoulder=position(upper,ikV[0]),elbow=position(fore,ikV[1]),wrist=position(d.leftHand,ikV[2]);
 const l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(wrist),axis=ikV[3].copy(target).sub(shoulder),dist=THREE.MathUtils.clamp(axis.length(),Math.abs(l1-l2)+.001,l1+l2-.001);axis.normalize();
 const side=ikV[4];if(poleDirection)side.copy(poleDirection);else side.set(-.25,-.55,.05);side.addScaledVector(axis,-side.dot(axis)).normalize();
 const along=(l1*l1-l2*l2+dist*dist)/(2*dist),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const goal=ikV[5].copy(shoulder).addScaledVector(axis,along).addScaledVector(side,height);
 rotateJoint(upper,ikV[6].copy(elbow).sub(shoulder),ikV[7].copy(goal).sub(shoulder),fresh);if(fresh){fore.updateWorldMatrix(false,false);d.leftHand.updateWorldMatrix(false,false);}
 position(fore,ikV[1]);position(d.leftHand,ikV[2]);rotateJoint(fore,ikV[6].copy(ikV[2]).sub(ikV[1]),ikV[7].copy(target).sub(ikV[1]),fresh);
 d.leftHand.quaternion.copy((fresh?freshQuaternion(d.leftHand.parent,ikQ[4]):d.leftHand.parent.getWorldQuaternion(ikQ[4])).invert().multiply(orientation));
}
// Shortest-path target for a wrapped angle: the knife flip completes whole turns
// and must land on the rest pose instead of unwinding them.
const toward=(current,target)=>target+Math.atan2(Math.sin(current-target),Math.cos(current-target));
// V32 first-person rig. The hands of these rigs hang from IK controllers, not from
// the forearms: a hand moves only when its own bone is placed, and the arm is then
// bent to reach it with the forearm's real length (bending the arm alone left the
// hand behind, which is what made the hands look detached in reloads and inspection).
const rigM=Array.from({length:6},()=>new THREE.Matrix4()),rigQ=Array.from({length:6},()=>new THREE.Quaternion()),rigV=Array.from({length:8},()=>new THREE.Vector3()),rigE=new THREE.Euler(0,0,0,'YXZ'),rigS=new THREE.Vector3();
const hv=new THREE.Vector3(),hq=new THREE.Quaternion(),wq=new THREE.Quaternion(),aq=new THREE.Quaternion(),workQ0=new THREE.Quaternion(),pv=Array.from({length:8},()=>new THREE.Vector3());
function carry(obj,D){obj.updateWorldMatrix(true,false);rigM[4].multiplyMatrices(D,obj.matrixWorld);rigM[5].copy(obj.parent.matrixWorld).invert().multiply(rigM[4]).decompose(obj.position,obj.quaternion,rigS);obj.scale.copy(rigS);obj.updateMatrixWorld(true);}
function solveArm(arm,target,pole){
 const [fore,upper]=arm.joints;if(!fore||!upper||!arm.wristLocal)return;upper.updateWorldMatrix(true,true);
 let shoulder=upper.getWorldPosition(rigV[0]);const elbow=fore.getWorldPosition(rigV[1]),wrist=fore.localToWorld(rigV[2].copy(arm.wristLocal));
 const l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(wrist),axis=rigV[3].copy(target).sub(shoulder),over=axis.length()-(l1+l2)*.985;
 // Out of reach: the shoulder follows by up to six centimetres, as the body leans in.
 if(over>0&&arm.leftAnchor){const shift=rigV[4].copy(axis).normalize().multiplyScalar(Math.min(over,.06));arm.leftAnchor.position.copy(arm.leftAnchor.parent.worldToLocal(arm.leftAnchor.getWorldPosition(rigV[5]).add(shift)));upper.updateWorldMatrix(true,true);upper.getWorldPosition(shoulder);fore.getWorldPosition(elbow);axis.copy(target).sub(shoulder);}
 const dist=THREE.MathUtils.clamp(axis.length(),Math.abs(l1-l2)+.001,l1+l2-.001);axis.normalize();
 const side=rigV[4].copy(pole);side.addScaledVector(axis,-side.dot(axis)).normalize();
 const along=(l1*l1-l2*l2+dist*dist)/(2*dist),height=Math.sqrt(Math.max(0,l1*l1-along*along)),goal=rigV[5].copy(shoulder).addScaledVector(axis,along).addScaledVector(side,height);
 rotateJoint(upper,rigV[6].copy(elbow).sub(shoulder),rigV[7].copy(goal).sub(shoulder));
 fore.getWorldPosition(elbow);fore.localToWorld(wrist.copy(arm.wristLocal));rotateJoint(fore,rigV[6].copy(wrist).sub(elbow),rigV[7].copy(target).sub(elbow));
 // V44: the forearm's twist follows the hand (viewmodel-arms.js).
 untwist(arm.twist);
}
function placeHand(arm,pos,quat,pole){const h=arm?.leftHand;if(!h)return;hv.copy(pos);h.parent.updateWorldMatrix(true,false);if(quat)h.quaternion.copy(h.parent.getWorldQuaternion(hq).invert().multiply(quat));h.position.copy(h.parent.worldToLocal(rigV[0].copy(hv)));h.updateMatrixWorld(true);solveArm(arm,hv,pole);
 // Still out of reach: the hand stops at the end of the straightened arm, never beyond it.
 const end=arm.joints[0].localToWorld(rigV[0].copy(arm.wristLocal));if(end.distanceToSquared(hv)>4e-6){h.position.copy(h.parent.worldToLocal(end));h.updateMatrixWorld(true);}}
// Where the support hand works each part, in the rig's rest frame: wrist offset from
// the part and the turn of the hand relative to its fore-end grip.
// The pistol magazine is short: the palm cups its base rather than its body.
const PISTOL_MAG=[.006,.03,-.004];
const WORK={
 mag:{at:[-.012,-.02,.006],turn:[-.15,-.25,-.35]},
 scope:{at:[-.02,.07,-.03],turn:[.25,0,2.6]},
 // Precision rifle reload: the hand comes up from below on the port side and thumbs rounds in;
 // V42: it no longer climbs over the top, where the palm covered the scope.
 port:{at:[.02,-.01,0],turn:[.1,0,1.2]},
 // Submachine gun cocking handle: an overhand slap from above.
 handle:{at:[-.01,.022,.03],turn:[.2,0,2.4]},
 // Precision rifle inspection: the hand runs forward along the fore-end (bolt channel = the slide)
 // instead of climbing to the scope, which put the whole forearm across the rifle.
 front:{at:[0,-.004,-.02],turn:[0,0,0],slide:-.09},
 // OB-510 AVERLA (V42): the palm cups the detachable magazine's body, below its node at the top of the magazine;
 // the support hand takes the left one of the twin bolt handles (bolt frame, gun units .5) from the side.
 // Their turns (`q`) are set below from the hand's frame at rest on the forward grip.
 mag4:{at:[-.02,-.08,.004],turn:[0,0,0]},
 handle4:{at:[-.055,-.025,-.03],turn:[0,0,0]},
 // V44 classic AVERLA: the hand over the ejection port, palm down and a little right, knuckles along the bore, thumb in the port.
 port4c:{at:[-.02,.03,.03],turn:[0,0,0]}
};
const workPart=(d,kind)=>kind==='scope'||kind==='port'||kind==='port4c'?d.port:kind==='handle'||kind==='handle4'?d.bolt:d.magSocket;
function inspectRig(root,d,ip,w){
 const rq=root.getWorldQuaternion(rigQ[1]),rqi=rigQ[0].copy(rq).invert(),p=d.pivot,R=rigQ[2].setFromEuler(rigE.set(ip.pitch*w,ip.yaw*w,ip.roll*w,'YXZ'));
 // Long guns are held further out when turned, so the whole piece stays in the frame.
 const turned=Math.min(1,(Math.abs(ip.yaw)+Math.abs(ip.roll))/.5)*w,out=(d.index===2?.09:d.index===3?.06:d.index===1?.04:.015)*turned,down=(d.index===2?.045:0)*turned;
 rigM[0].makeTranslation(-p.x,-p.y,-p.z);rigM[1].makeRotationFromQuaternion(R).premultiply(rigM[2].makeTranslation(p.x+ip.x*w,p.y+ip.y*w-down,p.z+ip.z*w-out)).multiply(rigM[0]);
 (d.inspectQ??=new THREE.Quaternion()).copy(R);
 const D=rigM[3].copy(root.matrixWorld).multiply(rigM[1]).multiply(rigM[0].copy(root.matrixWorld).invert());
 const [L,Rt]=d.fpArms,handPos=pv[0],handQ=rigQ[3];L.leftHand.getWorldPosition(handPos);L.leftHand.getWorldQuaternion(handQ);
 carry(d.index===5?d.knife:d.gun,D);carry(Rt.leftHand,D);
 solveArm(Rt,Rt.leftHand.getWorldPosition(pv[1]),pv[2].set(.3,-.85,.1).applyQuaternion(rq));
 if(d.index===5)return;
 // The support hand rides the fore-end, and leaves it to work a part or to make room.
 const gq=rigQ[4].copy(rq).multiply(R).multiply(rqi),ridePos=pv[3].copy(handPos).applyMatrix4(D),rideQ=rigQ[5].copy(gq).multiply(handQ),h=ip.hand*w;
 if(h>.001){
  // Where the hand works: a part of the weapon (rest frame offsets turned with it), or a
  // low point out of the way (the pouch, when it carries a magazine).
  const offset=pv[4],workQ=wq,workPos=pv[5];
  const aim=(kind,pos,q)=>{const work=WORK[kind],part=workPart(d,kind),turn=work.q?hq.copy(work.q):hq.setFromEuler(rigE.set(work.turn[0],work.turn[1],work.turn[2],'YXZ'));
   q.copy(rq).multiply(R).multiply(turn).multiply(rqi).multiply(L.workRest?workQ0.copy(rq).multiply(L.workRest):handQ);
   const at=(d.workAt??=new THREE.Vector3()).fromArray(d.index===0&&kind==='mag'?PISTOL_MAG:work.at).applyQuaternion(R).applyQuaternion(rq);
   // A part is reached palm first (wrist offset turned with the hand); a point along the
   // fore-end is measured from the wrist as it rides, so no palm offset applies.
   if(part)part.getWorldPosition(pos).add(at).add(offset.copy(d.workOffset||d.gripOffset||offset.set(-.04,-.01,.05)).applyQuaternion(turn).applyQuaternion(R).applyQuaternion(rq));else pos.copy(ridePos).add(at);};
  // V44 review: the classic AVERLA works its port from its own fitted hold (`port4c`), in reload and inspection alike; its
  // old moves were turns from the authored hand on the scope bell and left the hand open and palm up beside the rifle.
  const kind=d.classic?'port4c':ip.work||(d.index===4&&!d.classic?'mag4':'mag');aim(kind,workPos,workQ);
  // A wrist twist works the scope turret, a click at a time; the thumb presses rounds in;
  // along the fore-end the hand slides toward the muzzle and back.
  if(kind==='scope')workQ.multiply(hq.setFromAxisAngle(pv[6].set(0,0,1),ip.bolt*w*.5));
  if(kind==='port'||kind==='port4c')workPos.add(pv[6].set(0,-.028*ip.mag,0).applyQuaternion(R).applyQuaternion(rq));
  if(kind==='front')workPos.add(pv[6].set(0,0,WORK.front.slide*ip.bolt*w).applyQuaternion(R).applyQuaternion(rq));
  if(ip.alt>.001&&d.bolt){const altPos=pv[7];aim(d.classic?'port4c':d.index===4?'handle4':'handle',altPos,aq);workPos.lerp(altPos,ip.alt);workQ.slerp(aq,ip.alt);}
  // Out of the way: straight down past the frame, never toward the camera (a forearm
  // pointed at the lens reads as a tube across the picture).
  const away=pv[6].copy(handPos).add(pv[7].fromArray(ip.reload?[-.03,-.24,.12]:[-.09,-.22,-.02]).applyQuaternion(rq)),u=ip.target;
  workPos.lerp(away,u);workQ.slerp(handQ,u);
  ridePos.lerp(workPos,h).add(pv[7].set(-.035,-.035,.035).applyQuaternion(rq).multiplyScalar(Math.sin(Math.PI*h)));rideQ.slerp(workQ,h);
 }
 placeHand(L,ridePos,rideQ,pv[2].set(-.3,-.85,.1).applyQuaternion(rq));
 // Carried magazine: it leaves the well in the palm and comes back in it.
 if(ip.carry>.001&&d.mag&&d.magSocket&&d.gripOffset){const hand=L.leftHand,turnNow=hq.copy(hand.getWorldQuaternion(wq)).multiply(rigQ[0].copy(handQ).invert());
  const palm=hand.getWorldPosition(pv[1]).sub(pv[4].copy(d.gripOffset).applyQuaternion(rq).applyQuaternion(turnNow)),socket=d.magSocket.getWorldPosition(pv[5]);
  if(d.workAt)socket.add(d.workAt);const shift=palm.sub(socket).multiplyScalar(Math.min(1,ip.carry*w));d.mag.position.copy(d.mag.parent.worldToLocal(d.mag.getWorldPosition(pv[6]).add(shift)));d.mag.updateMatrixWorld(true);}
}
// V42 OB-510 AVERLA: bolt travel (gun units, the model's tested limit), the right bolt handle in the bolt's frame.
const BOLT_TRAVEL_4=.246,HANDLE_4=[.083,0,-.104],ease01=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// At the hip: palm point on the forward grip (gun units), the grip's axis and the palm's facing (the hand is turned
// onto them, then by `turn`, rig frame YXZ). The shoulder sits 30 cm left of and 20 cm below the wrist, 10 cm toward the eye: the forearm keeps its own length
// (V42 review: the old 1.55 stretch read as a tube) and comes in from the lower left, the back of the glove toward the eye.
// The rifle sits low, 0.24 rad inward and canted 0.2 rad, so its left flank shows and the stock leaves the picture
// left of the ammo panel (1600x900 and phone landscape checked).
// V42 review: the palm point sits 3.5 cm right of the grip's left face, so the grip runs through the closed fist
// instead of the fist resting against the fore-end's flank.
// On a phone (V42 review) the rifle sits 6 cm further left, 2 cm higher and turned in less (0.18 rad): its receiver, scope
// and both hands stay in the clear middle between the health and ammo readouts and the button cluster (844x390 checked).
const SUPPORT_4={at:[.035,-.085,-.12],axis:[0,-.924,-.383],palm:[.75,0,-.65],turn:[0,0,0],hip:[.07,-.185,-.6],yaw:.06,roll:0,shoulder:[-.3,-.2,.1],forearm:1,touch:{hip:[.03,-.19,-.62],yaw:.06}};
// V44 classic AVERLA (the rig's own rifle): its authored support arm never reached its hand, which hung on the scope's
// front bell from a flattened, folded forearm. It now takes the same fitted hold as the AVERLA: palm under the fore-end
// (gun units; the fore-end's underside is at y -0.035 from z -0.1 to -0.5), knuckle line along the bore, palm up and a
// little to the right so the fingers close round the far side, the shoulder re-seated low left every frame. No turn or
// cant: the rifle stays square to the view. Reload and inspection keep the classic's own work (`keepWork`).
// V44 review: the palm on the fore-end's left flank, thumb over the top (palm up hid the whole hand behind the rifle), the
// shoulder lower, so the forearm rises from the bottom edge instead of running in flat from the left with a hump.
// V44 review 2: the classic takes the AVERLA's own hold (same hand, forearm, cuff and shoulder), only turned in a little less:
// its tall receiver and tube scope, seen from the AVERLA's 0.06 rad, read as canted (scope off to the right).
const SUPPORT_4C={...SUPPORT_4,yaw:-.02,touch:{...SUPPORT_4.touch,yaw:-.02}};
// V44 pistols (all designs share the rig): a two-hand hold. The support palm fills the left side of the grip (gun units;
// grip faces x +-0.029, front edge z 0.07-0.09, raked back 0.2 per unit down), knuckle line down the grip, fingers
// forward round the trigger hand's; the rig is turned 0.2 rad in and canted a touch so the right flank of the slide and
// its lines show (on a phone 1.4 cm further left, clear of the ammo readout). `grip`: the trigger hand's fingers close round the grip (axis point, direction, radius).
// V44 review: turned 0.34 rad (was 0.2: only a sliver of the slide showed) and canted 0.1, a little lower and further out so the
// gloves sit under the slide instead of beside it; on a phone 2.6 cm further left and 1 cm higher, clear of the ammo readout.
const SUPPORT_0={at:[-.07,-.045,.12],axis:[0,-.98,.2],palm:[1,.1,-.25],turn:[0,0,0],yaw:0,roll:0,shoulder:[-.2,-.24,.14],forearm:1,pole:[-.3,-.75,.1],keepWork:true,wrap:[[0,-.07,.13],[0,-.98,.2],.072],grip:[[0,-.06,.125],[0,-.98,.2],.05]};
// V44 review: the rifles' support arm (SMG, RONCOLA, TARLO and their designs). The rigs' authored shoulder sat level with
// the hand and 26 cm back, so the upper arm ran flat along the bottom of the picture and its cut end showed as a folded
// stub (ASSILLO) while the forearm crossed the screen as a pipe. The shoulder is re-seated below and behind the wrist
// every frame (rig frame, metres) and the arm solved to the hand with the elbow down and out: the forearm rises from
// the bottom edge, the elbow's bend sits at the edge, the upper arm leaves the picture downward.
// V44 review: the support shoulder is seated once, in the rig's own frame (at build and when a design moves the hand):
// `shoulder` from the resting wrist as seen at the hip (the hip's turn and cant taken out), never further than 96 % of
// the arm's reach. Its rest is moved there, so the arm keeps it like any other rest and only the IK's reach rule moves
// it (up to 6 cm) while the hand works; the old seat followed the hand every frame, 0.5-0.8 m off its rest.
const seatQ=new THREE.Quaternion(),seatE=new THREE.Euler();
function seatShoulder(root,d,S){
 const L=d.fpArms?.[0],up=d.joints?.[1],fore=d.joints?.[0],end=root.getObjectByName('BoneTwist_01L_end');if(!L?.leftAnchor||!up||!fore||!S?.shoulder)return;
 L.leftAnchor.position.copy(L.leftAnchorRest);root.updateMatrixWorld(true);
 const w=root.worldToLocal(d.leftHand.getWorldPosition(new THREE.Vector3())),sh=root.worldToLocal(up.getWorldPosition(new THREE.Vector3())),el=root.worldToLocal(fore.getWorldPosition(new THREE.Vector3()));
 const reach=sh.distanceTo(el)+(end?el.distanceTo(root.worldToLocal(end.getWorldPosition(new THREE.Vector3()))):el.distanceTo(w));
 const off=new THREE.Vector3(...S.shoulder).applyQuaternion(seatQ.setFromEuler(seatE.set(0,S.yaw||0,S.roll||0)).invert());off.setLength(Math.min(off.length(),reach*.96));
 const shift=w.add(off).sub(sh),anchor=root.localToWorld(root.worldToLocal(L.leftAnchor.getWorldPosition(new THREE.Vector3())).add(shift));
 L.leftAnchor.position.copy(L.leftAnchor.parent.worldToLocal(anchor));L.leftAnchorRest=L.leftAnchor.position.clone();if(d.leftAnchorRest)d.leftAnchorRest=L.leftAnchorRest;root.updateMatrixWorld(true);
}
// The pistol rig (and the knife's, built on it): the glove a further size down, two hands round a grip 3 cm wide.
const PISTOL_ARMS={...ARM_SHAPE,hand:.72};
const SEAT={1:{shoulder:[-.12,-.19,.15],pole:[-.35,-.8,.05]},2:{shoulder:[-.12,-.2,.16],pole:[-.35,-.8,.05]},3:{shoulder:[-.12,-.2,.16],pole:[-.35,-.8,.05]}};
// A turn of the support hand between two holds, each given as the knuckle line (index to little finger) and the
// palm's facing in the rifle's frame. The AVERLA's hand rests on the forward grip; on the magazine the knuckle line
// runs down its body, on the left bolt handle the fist closes round it from behind, knuckle line out to the left.
function holdTurn(fa,na,fb,nb){const basis=(f,n)=>{f=new THREE.Vector3(...f).normalize();n=new THREE.Vector3(...n);n.addScaledVector(f,-n.dot(f)).normalize();return new THREE.Matrix4().makeBasis(f,new THREE.Vector3().crossVectors(n,f),n);};return new THREE.Quaternion().setFromRotationMatrix(basis(fb,nb).multiply(basis(fa,na).transpose()));}
WORK.port4c.q=holdTurn(SUPPORT_4C.axis,SUPPORT_4C.palm,[0,-.15,1],[.35,-1,0]);WORK.mag4.q=holdTurn(SUPPORT_4.axis,SUPPORT_4.palm,[0,-1,.12],[.85,0,-.5]);WORK.handle4.q=holdTurn(SUPPORT_4.axis,SUPPORT_4.palm,[-1,-.2,0],[0,.3,-.95]);
export function animateViewmodel(root,{time,moving,aim,recoil,reloading,reloadDuration=2,inspecting=false,inspectPose=null,cycling=0,semi=false,dt,reloadTime=time,motion={},switchLower=0,strike=0,heavy=false,empty=false,utility=null}){
 const d=root.userData;if(!d.model)return;
 if(reloading&&!d.wasReload)d.reloadStart=reloadTime;d.wasReload=reloading;
 const rt=reloading?Math.min(1,(reloadTime-d.reloadStart)/(reloadDuration*1000)):0;
 // Reload and inspection share one rig: the weapon turns about the grip, the hands do the work.
 const raw=inspectPose||(reloading&&d.pivot?reloadPose(rt,d.index):null)||(inspecting?inspectionPose(.4,d.index):null);const v=d.fpScratch;const hip=d.motionHip??=new THREE.Vector3();hip.copy(d.hip);const bob=Math.sin(time*.009)*.0025*moving;
 // Inspection weight: 1 while it plays; a cancel (shot, aim, reload, switch) hands the
 // weapon back to the firing pose in about 60 ms instead of drifting back.
 if(raw){d.ipLast=raw;d.ipW=1;}else d.ipW=(d.ipW||0)*Math.exp(-dt/.018);const ipw=raw?1:d.ipW>.01?d.ipW:0,ip=ipw?d.ipLast:null;
 const target=d.motionTarget??=new THREE.Vector3();target.copy(hip);if(aim){target.x=0;target.y-=.015;target.z+=.025}target.x+=motion.weaponX||0;target.y+=motion.weaponY??bob;target.z+=recoil*.25;
 const slash=d.index===5&&strike>0?Math.sin(Math.PI*Math.min(1,strike)):0;
 target.y-=switchLower*.30;target.z+=switchLower*.09;
 if(slash){target.x-=slash*(heavy?.09:.14);target.y+=slash*(heavy?.02:.035);target.z-=slash*(heavy?.18:.07);}
 // Smoke throw (V42): the canister comes up into the middle while the pin is pulled, is drawn back
 // when a button is held, then thrown: overhand (wind back, whip forward, follow through down) or an
 // underhand lob (dip, swing up). V42 review: the world canister is launched on the release, so the hand
 // lets go at 12 % (about 40 ms, the wind-back is short) instead of 45 %, which showed two canisters.
 let throwPitch=0;const u=d.index===5?utility:null;
 if(u){const t=u.throw,pin=u.pin<1?Math.sin(Math.PI*u.pin):0;target.x-=.035*pin;target.y+=.03*pin;throwPitch-=.12*pin;
  if(t>0){const a=Math.min(1,t/.1),b=t<.06?0:Math.min(1,(t-.06)/.22),e=Math.max(0,(t-.28)/.72);
   if(u.lob){target.y+=-.08*a+.12*b-.14*e;target.z-=.2*b;throwPitch+=.32*a-.72*b+.25*e;}
   else{target.x-=.03*b;target.y+=.07*a+.05*b-.22*e;target.z+=.12*a-.4*b+.1*e;throwPitch+=-.45*a+.95*b-.3*e;}}
  else{target.z+=.05*u.cook;target.y+=.02*u.cook;throwPitch-=.14*u.cook;}}
 const cycle=cycling>0?Math.sin(Math.PI*cycling):0;const roll=cycle*.16,pitch=recoil*.8+cycle*.07+switchLower*.45+(d.index===5?slash*.45:0)+throwPitch;target.y-=cycle*.035;
 // Spring kick is layered on top of the smoothed base pose and removed before smoothing again.
 const kick=motion.kick,applied=d.appliedKick??={x:0,y:0,z:0,pitch:0,yaw:0,roll:0};
 root.position.x-=applied.x;root.position.y-=applied.y;root.position.z-=applied.z;root.rotation.x-=applied.pitch;root.rotation.y-=applied.yaw;root.rotation.z-=applied.roll;
 // OB-510 AVERLA: the hip turn and cant fade out as an inspection or reload pose builds and back in as it settles
 // (V42 review: dropping them on the key swung the rifle end-on before the moves began, and back after they ended).
 // They sit outside the smoothing like the kick, on a fast weight, so they trade off against the pose frame by frame
 // instead of lagging it, and give way over a full radian of pose (V42 review 2: lagging it, and giving way over 0.6 rad,
 // let the rifle swing 0.08 and 0.03 rad past its rest after the inspection; now 0.008 rad, 0.004 after the reload).
 const h4=d.hip4??={yaw:0,roll:0,w:1},S4=d.support4;root.rotation.y-=h4.yaw;root.rotation.z-=h4.roll;
 if(S4)h4.w=THREE.MathUtils.damp(h4.w,aim?0:raw?Math.max(0,1-(Math.abs(raw.pitch)+Math.abs(raw.yaw)+Math.abs(raw.roll))/1):1,aim?12:30,dt);
 const rollGoal=roll+(motion.roll||0)-switchLower*.35-(d.index===5?slash*.65:0);
 root.position.lerp(target,1-Math.exp(-16*dt));root.rotation.x=THREE.MathUtils.damp(root.rotation.x,pitch,18,dt);root.rotation.y=THREE.MathUtils.damp(root.rotation.y,0,12,dt);root.rotation.z=THREE.MathUtils.damp(toward(root.rotation.z,rollGoal),rollGoal,12,dt);
 h4.yaw=S4?S4.yaw*h4.w:0;h4.roll=S4?S4.roll*h4.w:0;root.rotation.y+=h4.yaw;root.rotation.z+=h4.roll;
 const live=kick&&!raw&&d.index!==5?kick:null;for(const key of ['x','y','z','pitch','yaw','roll'])applied[key]=live?live[key]:0;
 root.position.x+=applied.x;root.position.y+=applied.y;root.position.z+=applied.z;root.rotation.x+=applied.pitch;root.rotation.y+=applied.yaw;root.rotation.z+=applied.roll;
 for(const arm of d.fpArms)if(arm){arm.joints.forEach((j,i)=>j.quaternion.copy(arm.rest[i]));if(arm.twist)arm.twist.bones.forEach((b,i)=>b.quaternion.copy(arm.twist.rest[i]));if(arm.leftAnchorRest)arm.leftAnchor.position.copy(arm.leftAnchorRest);if(arm.leftHand&&arm.leftRest){arm.leftHand.quaternion.copy(arm.leftRest);if(arm.handPosRest)arm.leftHand.position.copy(arm.handPosRest);}}
 if(d.gunRest){d.gun.position.copy(d.gunRest.position);d.gun.quaternion.copy(d.gunRest.quaternion);d.gun.scale.copy(d.gunRest.scale);}
 const rq=root.getWorldQuaternion(rigQ[1]);
 if(d.index===5){
  root.updateMatrixWorld(true);if(d.knifeGrip)d.knife.position.copy(root.worldToLocal(d.knifeGrip.getWorldPosition(v[0])));
  // Inspection toss: the blade turns end over end about its own axis and rises a little.
  // Inspection toss: the blade turns end over end about its own middle (not about the
  // grip, which swept the blade through the fingers) and rises clear of the hand.
  const spin=(ip?.bolt||0)*(raw?1:0),toss=Math.sin(Math.PI*Math.min(1,spin));// (V44: past 1 the catch's overshoot)
 d.knife.rotation.set(.52+spin*Math.PI*2,0,0);d.knife.position.y+=toss*.13;d.knife.position.z-=toss*.1;
  if(spin>0){const c=v[3].set(0,0,-.05),atRest=v[4].copy(c).applyAxisAngle(v[5].set(1,0,0),.52),now=c.applyAxisAngle(v[5],d.knife.rotation.x);d.knife.position.add(atRest.sub(now).multiplyScalar(toss));}
  {const F=d.knifeFingers,catchOpen=spin>0&&spin<1?ease01(spin/.25)*(1-ease01((spin-.8)/.17)):0,want=u?1:catchOpen*.85;if(F&&Math.abs(want-F.now)>.002){F.now=want;F.bones.forEach((b,i)=>b.quaternion.slerpQuaternions(F.closed[i],F.open[i],want));}}
  const can=d.canister;if(can){const held=!!u&&u.throw<.12;can.visible=held;d.knife.visible=!u;
   // Pin pull: the canister is twisted up toward the eye and the thumb flicks the ring off; it
   // spins away up and to the left and falls out of the picture. The spoon flies at release.
   if(held){const p=u.pin,twist=p<1?Math.sin(Math.PI*p):0,ring=can.userData.ring,pull=p<1?Math.max(0,Math.min(1,(p-.35)/.55)):1;
    can.position.copy(d.knife.position);can.position.y+=.008;can.position.z-=.012;can.rotation.set(.35+.25*twist,.5*twist,-.3-.2*twist);
    ring.visible=pull<.98;ring.position.copy(can.userData.ringRest);ring.position.x-=pull*.13;ring.position.y+=Math.sin(Math.PI*pull)*.09-pull*pull*.12;ring.rotation.set(pull*9,Math.PI/2,pull*5);
    can.userData.lever.rotation.x=-.1-(u.throw>.1?.9:0);}}
  // The free hand is lowered out of the way.
  if(d.leftHand){root.updateMatrixWorld(true);placeHand(d.fpArms[0],d.leftHand.getWorldPosition(v[0]).add(v[1].set(-.14,-.10,.02).applyQuaternion(rq)),null,v[2].set(-.35,-.7,.02).applyQuaternion(rq));}
 }
 // V44 review: a design whose fore-end is shorter or sits higher than the rig's own takes the support hand back onto it
 // (the OB-315 MAGLIO's hand reached past its muzzle device on the RONCOLA's long fore-end); gun units, per design.
 if(d.seat&&d.leftHand){const key=d.gun.userData.variantWant||'stock';if(key!==d.seatKey){d.seatKey=key;d.seatShift=fpSupportShift(d.index,key);}
  if(d.seatShift){root.updateMatrixWorld(true);const a=d.gun.localToWorld(v[0].set(0,0,0)),b=d.gun.localToWorld(v[1].fromArray(d.seatShift)).sub(a),h=d.leftHand.getWorldPosition(v[2]).add(b);d.leftHand.position.copy(d.leftHand.parent.worldToLocal(h));d.leftHand.updateMatrixWorld(true);}
  if(d.seatKey!==d.seatedKey){d.seatedKey=d.seatKey;seatShoulder(root,d,d.seat);}}
 const seat=d.support4||d.seat;
 if(seat){root.updateMatrixWorld(true);const wrist=d.leftHand?.getWorldPosition(v[0]);if(wrist&&d.leftAnchor){
  // V42: the rifle's authored arm never met its hand, and the old first fit measured the wrist wherever the
  // unreachable hand was (43 cm off the elbow, off the bone's axis): the skin between twisted into a thin tube.
  // The wrist is the bone's own end (as on the trigger arm); the shoulder is placed so the arm reaches the forward grip.
  const L=d.fpArms[0];if(!L.fitted&&d.fpArms[1]?.wristLocal){L.fitted=true;const end=root.getObjectByName('BoneTwist_01L_end');L.joints[0].scale.y=seat.forearm||1;L.joints[0].updateMatrixWorld(true);L.wristLocal=end?L.joints[0].worldToLocal(end.getWorldPosition(v[6])):d.fpArms[1].wristLocal.clone();}solveArm(L,wrist,v[5].fromArray(seat.pole||[-.25,-.7,.04]));}}
 // Parts: the magazine and the bolt, slide or charging handle, in the weapon's frame.
 if(d.mag){d.mag.position.copy(d.magRest);d.mag.visible=true;
  if(ip?.mag>.001){const drop=ip.mag*ipw*(ip.drop||.07);d.mag.position.y-=drop;d.mag.position.z+=drop*.14;}}
 const pull=d.index===5?0:(ip?.bolt||0)*ipw;
 // OB-510 AVERLA: a straight pull, no turn and no recoil travel (the action is locked). After the shot the bolt is drawn
 // fully back (the case leaves the port at 36 % of the cycle, the foley at 27 %) and driven home; reload and inspection
 // open it with their bolt channel.
 const work4=d.index===4&&!d.classic&&cycling>0&&cycling<1?cycling:0,open4=work4?(work4<.5?ease01((work4-.16)/.18):1-ease01((work4-.52)/.16)):0;
 // V42 b4b: a semi-automatic design (OB-520 GHEPPIO) snaps its side handle back with each shot instead of being worked by hand.
 if(d.bolt){d.bolt.position.copy(d.boltRest);const lock=d.index===0&&empty&&(!reloading||rt<.84)?1:0;
  if(d.index===4&&!d.classic)d.bolt.position.z+=Math.max(open4,pull,semi?Math.min(1,recoil*9):0)*BOLT_TRAVEL_4;else d.bolt.position.z+=recoil*.8+pull*(d.index===0?.026:.038)+lock*.024;
  if(d.boltRestQ)d.bolt.quaternion.copy(d.boltRestQ);}
 root.updateMatrixWorld(true);
 // The trigger hand leaves the grip for the right bolt handle, draws it and drives it home, then takes the grip again.
 const reach4=work4?ease01((work4-.04)/.12)*(1-ease01((work4-.7)/.16)):0;
 if(reach4>.001&&!ip&&d.bolt&&d.pivot){const R=d.fpArms[1],hand=R?.leftHand;if(hand){const wrist=hand.getWorldPosition(v[0]),grip=root.localToWorld(v[1].copy(d.pivot)),handle=d.bolt.localToWorld(v[2].fromArray(HANDLE_4));
  // The fist closes on the handle: the middle knuckle lands on it (V42 review: keeping the wrist's offset from the pistol
  // grip left the knuckles 6-7 cm wide of it); the hand arrives a little high, like a flick.
  const kn=d.knuckleR4??=root.getObjectByName('Bone_R009');
  const goal=v[3].copy(handle).add(kn?v[4].copy(wrist).sub(kn.getWorldPosition(v[7])):v[4].copy(wrist).sub(grip)).lerp(wrist,1-reach4);goal.addScaledVector(v[5].set(0,1,0).applyQuaternion(rq),.012*Math.sin(Math.PI*reach4));
  placeHand(R,goal,null,v[6].set(.3,-.85,.1).applyQuaternion(rq));root.updateMatrixWorld(true);}}
 if(ip&&d.pivot){inspectRig(root,d,ip,ipw);return;}d.inspectQ?.identity();
}
const boneKey=n=>n.replace(/^mixamorig[:_]?/,'').replace(/_0\d+$/,'');
function normalize(model){
 model.updateMatrixWorld(true);const b=new THREE.Box3();model.traverse(o=>{if(o.isMesh&&o.visible)b.union(new THREE.Box3().setFromObject(o));});
 const scale=1.82/(b.max.y-b.min.y),wrapper=new THREE.Group();wrapper.add(model);wrapper.scale.setScalar(scale);
 // The wrapper turns the authored +Z model toward the game's -Z forward axis.
 // Centering must account for that rotation, rather than doubling the source offset.
 wrapper.position.set((b.min.x+b.max.x)*scale/2,-b.min.y*scale,(b.min.z+b.max.z)*scale/2);wrapper.rotation.y=Math.PI;wrapper.updateMatrixWorld(true);return wrapper;
}

let contactTexture;
function contactShadow(){
 if(!contactTexture){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,5,32,32,32);g.addColorStop(0,'#000000b0');g.addColorStop(1,'#00000000');x.fillStyle=g;x.fillRect(0,0,64,64);contactTexture=new THREE.CanvasTexture(c);}
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.72,.62),new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,opacity:.2,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.014;shadow.renderOrder=1;shadow.userData.ownedGeometry=true;return shadow;
}
// Retarget the anatomical palm frame, not the skeleton's arbitrary bone axes.
// Right fingers wrap the pistol grip; the left palm cups the fore-end from below.
function gripOrientation(bones,side){
 const hand=bones.get(side+'Hand'),middle=bones.get(side+'HandMiddle1'),index=bones.get(side+'HandIndex1'),pinky=bones.get(side+'HandPinky1');
 if(!middle||!index||!pinky)return hand.getWorldQuaternion(new THREE.Quaternion());
 const forward=middle.position.clone().normalize(),across=index.position.clone().sub(pinky.position);across.addScaledVector(forward,-across.dot(forward)).normalize();
 const source=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,forward,new THREE.Vector3().crossVectors(across,forward)));
 const targetAcross=new THREE.Vector3(...(side==='Right'?[0,.6,-.8]:[0,0,-1])),targetForward=new THREE.Vector3(...(side==='Right'?[0,-.8,-.6]:[1,0,0]));
 return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(targetAcross,targetForward,new THREE.Vector3().crossVectors(targetAcross,targetForward))).multiply(source.invert());
}
// V34 draw batching. Concatenates indexed geometries with the same attribute layout,
// copying the stored values as they are: BufferGeometryUtils.mergeGeometries goes
// through normalize/denormalize for interleaved quantized data and would turn -128 into
// -127 in the GLB normals.
function concatGeometries(list){
 const first=list[0],names=Object.keys(first.attributes);
 const layout=g=>g.index&&!Object.keys(g.morphAttributes).length&&Object.keys(g.attributes).length===names.length&&names.every(n=>{const a=g.attributes[n],b=first.attributes[n];return a&&a.itemSize===b.itemSize&&a.normalized===b.normalized&&a.array.constructor===b.array.constructor;});
 if(!list.every(layout))return null;
 const geometry=new THREE.BufferGeometry();let vertices=0,indices=0;for(const g of list){vertices+=g.attributes.position.count;indices+=g.index.count;}
 for(const n of names){
  const size=first.attributes[n].itemSize,array=new first.attributes[n].array.constructor(vertices*size);let at=0;
  for(const g of list){const a=g.attributes[n];if(a.isInterleavedBufferAttribute){const src=a.data.array,stride=a.data.stride;for(let i=0;i<a.count;i++)for(let c=0;c<size;c++)array[at++]=src[i*stride+a.offset+c];}else{array.set(a.array.subarray(0,a.count*size),at);at+=a.count*size;}}
  geometry.setAttribute(n,new THREE.BufferAttribute(array,size,first.attributes[n].normalized));
 }
 const index=new (vertices>65535?Uint32Array:Uint16Array)(indices);let at=0,base=0;
 for(const g of list){const src=g.index.array;for(let i=0;i<g.index.count;i++)index[at++]=src[i]+base;base+=g.attributes.position.count;}
 geometry.setIndex(new THREE.BufferAttribute(index,1));return geometry;
}
// The operator export carries 14 skins on one skeleton (same bones, inverse binds and
// bind matrix). A clone kept 14 Skeleton copies, so every operator recomputed and
// uploaded its 88 bone matrices 12 times a frame and drew its body in 12 calls. One
// shared skeleton and one skinned mesh per material deform the same vertices the same
// way. The merged geometry is built once and shared by every clone, like the GLB
// geometry it replaces; the two hidden skins are left alone.
const skinBatches=new Map();
function batchSkins(model){
 const skins=[];model.traverse(o=>{if(o.isSkinnedMesh&&o.visible)skins.push(o);});
 const first=skins[0];if(!first)return;const skeleton=first.skeleton;
 const same=s=>s.parent===first.parent&&s.matrix.equals(first.matrix)&&s.bindMode===first.bindMode&&s.bindMatrix.equals(first.bindMatrix)&&s.castShadow===first.castShadow&&s.receiveShadow===first.receiveShadow&&s.renderOrder===first.renderOrder&&!Array.isArray(s.material)&&s.skeleton.bones.length===skeleton.bones.length&&s.skeleton.bones.every((b,i)=>b===skeleton.bones[i]&&s.skeleton.boneInverses[i].equals(skeleton.boneInverses[i]));
 if(!skins.every(same))return;
 const groups=new Map();for(const s of skins){if(!groups.has(s.material))groups.set(s.material,[]);groups.get(s.material).push(s);}
 for(const group of groups.values()){
  for(const s of group)s.skeleton=skeleton;if(group.length<2)continue;
  const key=group.map(s=>s.geometry.uuid).join();if(!skinBatches.has(key))skinBatches.set(key,concatGeometries(group.map(s=>s.geometry)));
  const geometry=skinBatches.get(key);if(!geometry)continue;
  group[0].geometry=geometry;group[0].boundingBox=group[0].boundingSphere=null;for(const s of group.slice(1))s.removeFromParent();
 }
}
// Rigid sibling meshes with one material and the same flags become one mesh. A
// model's own geometry (equipment, knife) is merged with each part's transform baked
// in and stays owned; shared GLB geometry is only merged when the parts sit untransformed
// in their parent, is stored as it is and is shared by every copy of the model.
const partBatches=new Map(),FINISH_SPLIT=/Magazine|ChargingHandle|RearIronSight/i,IDENTITY=new THREE.Matrix4();
function batchParts(parent){
 const groups=new Map();
 for(const o of parent.children){
  if(!o.isMesh||o.isSkinnedMesh||Array.isArray(o.material)||o.children.length)continue;o.updateMatrix();
  const owned=!!o.userData.ownedGeometry;if(!owned&&!o.matrix.equals(IDENTITY))continue;
  const key=[o.material.id,owned,o.castShadow,o.receiveShadow,o.visible,o.renderOrder,o.frustumCulled,FINISH_SPLIT.test(o.name)].join();
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 }
 for(const parts of groups.values()){
  if(parts.length<2)continue;const first=parts[0],owned=!!first.userData.ownedGeometry;let geometry;
  if(owned){const baked=parts.map(o=>o.geometry.clone().applyMatrix4(o.matrix));geometry=concatGeometries(baked);for(const g of baked)g.dispose();}
  else{const key=parts.map(o=>o.geometry.uuid).join();if(!partBatches.has(key))partBatches.set(key,concatGeometries(parts.map(o=>o.geometry)));geometry=partBatches.get(key);}
  if(!geometry)continue;
  const mesh=new THREE.Mesh(geometry,first.material);mesh.name=first.name;mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.visible=first.visible;mesh.renderOrder=first.renderOrder;mesh.frustumCulled=first.frustumCulled;mesh.userData.ownedGeometry=owned;
  parent.add(mesh);for(const o of parts){o.removeFromParent();if(owned)o.geometry.dispose();}
 }
}
// Skinned bodies were never frustum culled: their default bounds are measured once, in
// whatever pose the first render finds. A fixed sphere around the whole operator
// (crouch, raised rifle and the corpse pose included) lets the camera pass skip
// operators out of view; the shadow camera spans the arena and still draws them all.
// Rigid parts keep their exact geometry bounds. Measured while the root is at rest.
const OPERATOR_CENTER=new THREE.Vector3(0,.9,0),OPERATOR_RADIUS=1.4;
function cullOperator(root){
 root.updateMatrixWorld(true);const inverse=new THREE.Matrix4();
 root.traverse(o=>{if(!o.isMesh||o.frustumCulled)return;if(o.isSkinnedMesh){inverse.copy(o.matrixWorld).invert();o.boundingSphere=new THREE.Sphere(OPERATOR_CENTER.clone().applyMatrix4(inverse),OPERATOR_RADIUS/o.matrixWorld.getMaxScaleOnAxis());}o.frustumCulled=true;});
}
// V34: operators of one team share their body and equipment materials (the team tint
// is the same for all of them), so the renderer uploads each material's uniforms once
// per team rather than once per operator. They outlive any single operator and are not
// disposed with one.
const teamLooks={},tintedLooks=new WeakSet();
// V35 operators. Gear is built once per team/kit/accent/toggles in the rest pose (every
// clone shares the same skeleton rest) and expressed in each anchor bone's own frame, so a
// cached template can be cloned onto any operator in any pose: the clone shares the
// template's geometry and the team's materials, and only the gear groups change hands.
const operatorRest={frames:null,anchors:null},gearTemplates=new Map(),GEAR_BONES={head:'Head',chest:'Spine2',hips:'Hips',shoulderL:'LeftArm',shoulderR:'RightArm'};
function captureOperatorRest(root,bones){
 if(operatorRest.frames)return;root.updateMatrixWorld(true);const frames={},anchors={};
 for(const [anchor,name] of Object.entries(GEAR_BONES)){const bone=bones.get(name);if(!bone)continue;frames[anchor]=bone.matrixWorld.clone();anchors[anchor]=bone.getWorldPosition(new THREE.Vector3());}
 anchors.head.y+=.105;anchors.side=Math.sign(bones.get('RightUpLeg')?.getWorldPosition(new THREE.Vector3()).x||1)||1;
 operatorRest.frames=frames;operatorRest.anchors=anchors;
}
function gearTemplate(team,operator){
 const key=operatorKey(team,operator);let template=gearTemplates.get(key);if(template)return template;
 template=[];
 for(const [anchor,group] of buildGear(team,operator,operatorRest.anchors)){const frame=operatorRest.frames[anchor];if(!frame)continue;group.updateMatrix();const local=new THREE.Matrix4().copy(frame).invert().multiply(group.matrix);template.push({bone:GEAR_BONES[anchor],group,local});}
 gearTemplates.set(key,template);return template;
}
// Every gear piece the bots can wear, once, as plain meshes over the shared geometry and materials: what the
// warm-up needs, without dressing a rig 64 times. A player's own accent uses the same programs.
export function operatorGearParts(){const parts=new THREE.Group(),seen=new Set();if(!operatorRest.frames)return parts;
 for(const team of ['blue','orange'])for(const {id:kit} of KITS)for(let bits=0;bits<8;bits++)for(const {group} of gearTemplate(team,{kit,accent:team==='blue'?'naval':'sand',visor:bits&1,mask:bits>>1&1,pack:bits>>2&1}))group.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+[o.material].flat().map(m=>m.uuid).join();if(seen.has(key))return;seen.add(key);const m=new THREE.Mesh(o.geometry,o.material);m.castShadow=o.castShadow;m.receiveShadow=o.receiveShadow;m.frustumCulled=false;parts.add(m);});
 // V43 oR: every classic kit's wear built now (not when a bot first wears it) and its two programs: the wear and the kit suit.
 if(warmBody){const suit=warmBody.find(x=>skinName(x)==='Mil_Suit_R5'),head=warmBody.find(x=>/_Head$/.test(skinName(x)));if(suit){let geo=null;for(const kit of WEAR_KITS)for(const mask of [0,1])geo=wearGeometry(kit,{mask},suit,head)||geo;
  const add=(g,mat)=>{const m=new THREE.SkinnedMesh(g,mat);m.bind(suit.skeleton,suit.bindMatrix);m.customDepthMaterial=skinDepth;m.castShadow=m.receiveShadow=true;m.frustumCulled=false;parts.add(m);};
  if(geo)add(geo,wearLook('blue','naval'));add(geo?wearSuitGeometry(geo,suit.userData.baseSuitGeometry||suit.geometry):suit.geometry,wearSuitLook(suit.userData.baseMaterial||suit.material,'blue','assalto'));if(head)add(head.geometry,wearHeadLook(head.userData.baseMaterial||head.material,'blue','ricognizione'));}}
 return parts;}
// ---- V44 GIRO 1: the whole-body operators ------------------------------------------------------------------------------
// Five kits (operator-kits.js BODIES; V44 op2: MASTINO went back to the soldier's body) are whole bodies from CC BY 4.0 models (assets/CREDITS.md), built by
// art/source/v44/agenti/build_body.py: rest pose, the operator rig's mixamo bone names, decimated, WebP textures, meshopt. Each
// is drawn on the operator's own skeleton in place of the soldier's skins (the V42 CORAZZA method, now archived in
// archivio/v44-operatori): at load its rest pose is carried onto the operator's rest (each joint moved onto the operator's joint
// and turned onto its bone, the hands by their palm), so it takes the same pose, IK, grip, weapon, corpse and death camera as
// every kit, with the head at the same height. Hit zones never depend on the body (combat-rules.js): no bigger target.
// Its "_Team" materials take the team's dye, its "_Glow" materials glow in the team's light.
let warmBody=null,bodyBase=null;const bodyFits=new Map(),bodyLoads=new Map();let allBodies=null;
// Loaded on demand (the first operator to wear one) and, after the start-up, all of them one after the other (game.js): nobody
// waits for them on the loading screen.
const bodyListeners=new Set();export function onBodyReady(fn){bodyListeners.add(fn);}
export function loadBody(kit){if(!BODIES[kit])return Promise.resolve(false);if(!bodyLoads.has(kit))bodyLoads.set(kit,loader.loadAsync(BODIES[kit].file).then(g=>{loaded.set('body:'+kit,g);for(const f of bodyListeners)try{f(kit);}catch(e){console.warn(e);}return true;},e=>{console.warn('Operatore non caricato',kit,e?.message||e);bodyLoads.delete(kit);return false;}));return bodyLoads.get(kit);}
export const bodyReady=kit=>loaded.has('body:'+kit);
export function loadArmour(){return allBodies??=Object.keys(BODIES).reduce((p,kit)=>p.then(any=>loadBody(kit).then(ok=>any||ok)),Promise.resolve(false));}
export const armourReady=()=>Object.keys(BODIES).every(bodyReady);
// Every loaded body's programs (both teams), skinned on the first operator's skeleton; empty until one loads.
export function armourWarmParts(){const parts=new THREE.Group();if(!bodyBase)return parts;
 for(const kit of Object.keys(BODIES)){const fit=bodyReady(kit)&&bodyFit(kit,bodyBase);if(!fit)continue;
  for(const team of ['blue','orange'])fit.parts.forEach((part,i)=>{const m=new THREE.SkinnedMesh(part.geometry,bodyLook(kit,team)[i]);m.bind(bodyBase.skeleton,bodyBase.bindMatrix);m.customDepthMaterial=skinDepth;m.castShadow=m.receiveShadow=true;m.frustumCulled=false;parts.add(m);});}
 return parts;}
const TORSO_BONES=new Set(['Hips','Spine','Spine1','Spine2','Neck','Shoulder']);
const bodyNext=n=>{const m=/^(Left|Right)(.+)$/.exec(n);if(!m)return {Hips:'Spine',Spine:'Spine1',Spine1:'Spine2',Spine2:'Neck',Neck:'Head'}[n]||null;const next={Shoulder:'Arm',Arm:'ForeArm',ForeArm:'Hand',Hand:'HandMiddle1',UpLeg:'Leg',Leg:'Foot',Foot:'ToeBase'}[m[2]];if(next)return m[1]+next;const f=/^(Hand\D+)([12])$/.exec(m[2]);return f?m[1]+f[1]+(+f[2]+1):null;};
function bodyFit(kit,skin){
 const sk=skin.skeleton,names=sk.bones.map(b=>boneKey(b.name)),key=kit+':'+names.join();if(bodyFits.has(key))return bodyFits.get(key);
 const g=loaded.get('body:'+kit);let fit=null;
 if(g){
  const meshes=[];g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
  const ask=meshes[0].skeleton,aNames=ask.bones.map(b=>boneKey(b.name)),inv=new THREE.Matrix4();
  const joint=(list,inverses,n)=>{const i=list.indexOf(n);return i<0?null:new THREE.Vector3().setFromMatrixPosition(inv.copy(inverses[i]).invert());};
  const S=n=>joint(names,sk.boneInverses,n),A=n=>joint(aNames,ask.boneInverses,n);
  const tall=P=>P('Head').y-(P('LeftFoot').y+P('RightFoot').y)/2,k=tall(S)/tall(A);
  // The palm frame (towards the middle finger, across from the little finger to the index) keeps the hand's roll.
  const palm=(P,side)=>{const f=P(side+'HandMiddle1').sub(P(side+'Hand')).normalize(),a=P(side+'HandIndex1').sub(P(side+'HandPinky1'));a.addScaledVector(f,-a.dot(f)).normalize();return new THREE.Matrix4().makeBasis(f,a,new THREE.Vector3().crossVectors(f,a));};
  const TRUNK_LAT={Hips:['UpLeg'],Spine:['UpLeg'],Spine1:['UpLeg','Arm'],Spine2:['Arm'],Neck:['Arm']};
  const trunk=(P,n,next)=>{const u=P(next).sub(P(n)).normalize(),x=new THREE.Vector3();for(const r of TRUNK_LAT[n])x.add(P('Left'+r).sub(P('Right'+r)).normalize());x.addScaledVector(u,-x.dot(u)).normalize();return new THREE.Matrix4().makeBasis(x,u,new THREE.Vector3().crossVectors(x,u));};
  const turns=new Map(),turn=i=>{
   if(turns.has(i))return turns.get(i);const n=aNames[i],next=bodyNext(n);let q;
   const side=/^(Left|Right)Hand$/.exec(n)?.[1];
   if(side&&S(side+'HandMiddle1')&&A(side+'HandMiddle1')&&A(side+'HandIndex1')&&A(side+'HandPinky1'))q=new THREE.Quaternion().setFromRotationMatrix(palm(S,side).multiply(palm(A,side).invert()));
   // V44 op3: the trunk turns by a whole frame (its bone, and across it the hips or the shoulders), so a body modelled mid-stride or
   // twisted (SAETTA) stands square; every other bone swings from its parent's turn, so knees and elbows keep facing the trunk's way.
   else if(TRUNK_LAT[n]&&next&&S(n)&&S(next)&&A(next)&&TRUNK_LAT[n].every(r=>S('Left'+r)&&A('Left'+r)&&S('Right'+r)&&A('Right'+r)))q=new THREE.Quaternion().setFromRotationMatrix(trunk(S,n,next).multiply(trunk(A,n,next).invert()));
   else if(next&&S(n)&&S(next)&&A(next)){const p=ask.bones[i].parent,pi=p?.isBone?ask.bones.indexOf(p):-1,q0=pi>=0&&!/Hand/.test(n)?turn(pi):new THREE.Quaternion();q=new THREE.Quaternion().setFromUnitVectors(A(next).sub(A(n)).normalize().applyQuaternion(q0),S(next).sub(S(n)).normalize()).multiply(q0);}
   else{const parent=ask.bones[i].parent,p=parent?.isBone?ask.bones.indexOf(parent):-1;q=p>=0?turn(p).clone():new THREE.Quaternion();}
   turns.set(i,q);return q;};
  // Each body joint j carries its vertices by M_j = move onto the operator's joint · turn · scale about the body joint; arms
  // that are a bodybuilder's are brought to a soldier's girth about the operator's own bone axis (BODIES[kit].slim).
  const slimBy=BODIES[kit].slim||1,slim=n=>/ForeArm$|Arm$|Hand(\D+\d)?$/.test(n)?slimBy:1;
  const moves=aNames.map((n,i)=>{const a=A(n).multiplyScalar(k),s=S(n)||a,f=slim(n),M=new THREE.Matrix4().makeTranslation(s.x,s.y,s.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(turn(i))).multiply(new THREE.Matrix4().makeTranslation(-a.x,-a.y,-a.z)).multiply(new THREE.Matrix4().makeScale(k,k,k));
   const next=bodyNext(n);if(f===1||!next||!S(next))return M;const d=S(next).sub(s).normalize(),e=f-1;
   const Q=new THREE.Matrix4().set(1+e*(1-d.x*d.x),-e*d.x*d.y,-e*d.x*d.z,0,-e*d.y*d.x,1+e*(1-d.y*d.y),-e*d.y*d.z,0,-e*d.z*d.x,-e*d.z*d.y,1+e*(1-d.z*d.z),0,0,0,0,1);
   return new THREE.Matrix4().makeTranslation(s.x,s.y,s.z).multiply(Q).multiply(new THREE.Matrix4().makeTranslation(-s.x,-s.y,-s.z)).multiply(M);});
  // V44 op2: the build of a normal soldier (BODIES[kit].shape, measured against ASSALTO by tools/check_operators.mjs): after the
  // fit each joint's vertices are reshaped in the operator's frame. limb: girth about the bone's own axis (Arm, ForeArm, UpLeg, Leg),
  // eased into the next bone's over the last and first fifth of each bone, twist: a turn (degrees) about it; torso: [width, depth, yaw degrees, forward shift m] of
  // the trunk by height (Hips to Neck), about the spine; head (size), headPitch (degrees, + looks up), headZ and headY (m) about the
  // base of the skull; hand: size about the wrist (small under the soldier's gloves); foot: width, height and length about the sole.
  // Normals follow each map's inverse transpose.
  const SH=BODIES[kit].shape||{},U=S('Head').sub(S('Hips')).normalize(),X=S('LeftUpLeg').sub(S('RightUpLeg'));X.addScaledVector(U,-X.dot(U)).normalize();const Z=new THREE.Vector3().crossVectors(X,U);
  if(S('LeftToeBase')&&S('LeftToeBase').sub(S('LeftFoot')).dot(Z)<0)Z.negate();
  const TK=['Hips','Spine','Spine1','Spine2','Neck'].filter(k=>S(k)),TY=TK.map(k=>S(k).dot(U)),TV=TK.map(k=>SH.torso?.[k]||[1,1]),TC=TK.map(k=>S(k));
  const torsoAt=y=>{if(y<=TY[0])return [TV[0],TC[0]];for(let i=1;i<TK.length;i++)if(y<=TY[i]){const t=(y-TY[i-1])/(TY[i]-TY[i-1]);return [TV[i].map((v,j)=>(TV[i-1][j]||0)+((v||0)-(TV[i-1][j]||0))*t),TC[i-1].clone().lerp(TC[i],t)];}return [TV[TK.length-1],TC[TK.length-1]];};
  const LIMB=SH.limb||{},lf=n=>LIMB[n.replace(/^(Left|Right)/,'')]??1,LIMB_NEXT={Arm:'ForeArm',ForeArm:'Hand',UpLeg:'Leg',Leg:'Foot'},LIMB_PREV={ForeArm:'Arm',Leg:'UpLeg'};
  const shapeOf=aNames.map(n=>{const m=/^(Left|Right)?(.+)$/.exec(n),side=m[1]||'',core=m[2];
   if(LIMB_NEXT[core]&&side&&S(n)&&S(side+LIMB_NEXT[core])&&(SH.twist?.[n]||lf(n)!==1||lf(side+LIMB_NEXT[core])!==1||LIMB_PREV[core]&&lf(side+LIMB_PREV[core])!==1)){const s=S(n),ax=S(side+LIMB_NEXT[core]).sub(s),L=ax.length();ax.normalize();
    const f=lf(n),f0=LIMB_PREV[core]?(f+lf(side+LIMB_PREV[core]))/2:(1+f)/2,f1=LIMB_NEXT[core]==='Hand'||LIMB_NEXT[core]==='Foot'?(f+1)/2:(f+lf(side+LIMB_NEXT[core]))/2;
    const tw=(SH.twist?.[n]||0)*Math.PI/180,q=new THREE.Quaternion().setFromAxisAngle(ax,tw);
    return (p,nn)=>{const d=p.clone().sub(s),a=d.dot(ax),t=a/L,k=t<.2?f0+(f-f0)*Math.max(0,t)/.2:t>.8?f+(f1-f)*Math.min(1,(t-.8)/.2):f;d.addScaledVector(ax,-a);if(tw)d.applyQuaternion(q);p.copy(s).addScaledVector(ax,a).addScaledVector(d,k);if(tw)nn.applyQuaternion(q);const na=nn.dot(ax);nn.addScaledVector(ax,-na).multiplyScalar(1/k).addScaledVector(ax,na);};}
   if(SH.torso&&TORSO_BONES.has(core))return (p,nn)=>{const [[sx,sz,yaw,dz],c]=torsoAt(p.dot(U)),d=p.clone().sub(c),x=d.dot(X),z=d.dot(Z);p.addScaledVector(X,x*(sx-1)).addScaledVector(Z,z*(sz-1)+(dz||0));const nx=nn.dot(X),nz=nn.dot(Z);nn.addScaledVector(X,nx*(1/sx-1)).addScaledVector(Z,nz*(1/sz-1));
    if(yaw){const q=new THREE.Quaternion().setFromAxisAngle(U,yaw*Math.PI/180);p.sub(c).applyQuaternion(q).add(c);nn.applyQuaternion(q);}};
   const uni=(c,k)=>(p,nn)=>{p.sub(c).multiplyScalar(k).add(c);};
   if(core==='Head'&&(SH.head||SH.headPitch||SH.headZ||SH.headY)){const c=S('Head').addScaledVector(U,.02),k=SH.head||1,q=new THREE.Quaternion().setFromAxisAngle(X,-(SH.headPitch||0)*Math.PI/180),dz=SH.headZ||0,dy=SH.headY||0;
    return (p,nn)=>{p.sub(c).applyQuaternion(q).multiplyScalar(k).add(c).addScaledVector(Z,dz).addScaledVector(U,dy);nn.applyQuaternion(q);};}
   if(/^Hand/.test(core)&&side&&SH.hand)return uni(S(side+'Hand'),SH.hand);
   if((core==='Foot'||core==='ToeBase')&&side&&SH.foot&&S(side+'Foot')){const c=S(side+'Foot'),y0=(S(side+'ToeBase')||c).dot(U)-.035,[fx,fy,fz]=SH.foot;c.addScaledVector(U,y0-c.dot(U));
    return (p,nn)=>{const d=p.clone().sub(c),x=d.dot(X),y=d.dot(U),z=d.dot(Z);p.copy(c).addScaledVector(X,x*fx).addScaledVector(U,y*fy).addScaledVector(Z,z*fz);const nx=nn.dot(X),ny=nn.dot(U),nz=nn.dot(Z);nn.set(0,0,0).addScaledVector(X,nx/fx).addScaledVector(U,ny/fy).addScaledVector(Z,nz/fz);};}
   return null;});
  const sp=new THREE.Vector3(),sn=new THREE.Vector3(),pAcc=new THREE.Vector3(),qAcc=new THREE.Vector3();
  const remap=aNames.map(n=>{const i=names.indexOf(n);return i<0?names.indexOf('Hips'):i;}),toLocal=skin.bindMatrix.clone().invert(),normalLocal=new THREE.Matrix3().getNormalMatrix(toLocal);
  const v=new THREE.Vector3(),n=new THREE.Vector3(),acc=new THREE.Vector3(),nAcc=new THREE.Vector3(),t=new THREE.Vector3();
  const parts=meshes.map(mesh=>{
   const src=mesh.geometry,P=src.attributes.position,N=src.attributes.normal,J=src.attributes.skinIndex,W=src.attributes.skinWeight,count=P.count;
   const pos=new Float32Array(count*3),nor=new Float32Array(count*3),joints=new Uint8Array(count*4),weights=new Float32Array(count*4);
   for(let i=0;i<count;i++){
    v.fromBufferAttribute(P,i).applyMatrix4(mesh.bindMatrix);n.fromBufferAttribute(N,i).transformDirection(mesh.bindMatrix);acc.set(0,0,0);nAcc.set(0,0,0);
    for(let c=0;c<4;c++){const w=W.getComponent(i,c),j=J.getComponent(i,c);joints[i*4+c]=remap[j];weights[i*4+c]=w;if(!w)continue;acc.addScaledVector(t.copy(v).applyMatrix4(moves[j]),w);nAcc.addScaledVector(t.copy(n).applyQuaternion(turn(j)),w);}
    pAcc.set(0,0,0);qAcc.set(0,0,0);let shaped=false;for(let c=0;c<4;c++){const w=W.getComponent(i,c);if(!w)continue;const fn=shapeOf[J.getComponent(i,c)];sp.copy(acc);sn.copy(nAcc);if(fn){fn(sp,sn);shaped=true;}pAcc.addScaledVector(sp,w);qAcc.addScaledVector(sn,w);}
    if(shaped){const ws=W.getComponent(i,0)+W.getComponent(i,1)+W.getComponent(i,2)+W.getComponent(i,3);acc.copy(pAcc).divideScalar(ws||1);nAcc.copy(qAcc);}
    acc.applyMatrix4(toLocal);nAcc.applyMatrix3(normalLocal).normalize();pos.set([acc.x,acc.y,acc.z],i*3);nor.set([nAcc.x,nAcc.y,nAcc.z],i*3);
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));geometry.setAttribute('normal',new THREE.BufferAttribute(nor,3));
   for(const uv of ['uv','uv1'])if(src.attributes[uv])geometry.setAttribute(uv,src.attributes[uv]);
   geometry.setAttribute('skinIndex',new THREE.BufferAttribute(joints,4));geometry.setAttribute('skinWeight',new THREE.BufferAttribute(weights,4));geometry.setIndex(src.index);geometry.computeBoundingSphere();
   return {geometry,material:mesh.material,name:'Body '+kit+' '+mesh.material.name};
  });
  fit={parts};
 }
 bodyFits.set(key,fit);return fit;
}
// Team looks of a body, shared per kit and team: "_Team" materials are dyed in the team colour over their own shading (steel blue
// for Scolta, burnt orange for Razziatori; V44 op2: a little less saturated, and the near-black parts stay black, not navy or copper) where their base texture's alpha (the team mask, build step teammask.py) says so,
// or all over if it has no mask, and their emissive bits glow in the team's light (under the bloom threshold, postfx.js, like
// every agent); the rest keep the model's own colours. Painted plates, not chrome: one program per role for every body.
const bodyLooks=new Map(),BODY_TEAM={blue:[.2,.33,.52],orange:[.72,.4,.17]},BODY_GLOW={blue:[.08,.42,1],orange:[1,.36,.05]};
export function bodyLook(kit,team){
 const key=kit+':'+team;if(bodyLooks.has(key))return bodyLooks.get(key);
 const fit=[...bodyFits.entries()].find(([k,f])=>f&&k.startsWith(kit+':'))?.[1],cfg=BODIES[kit]||{};if(!fit)return [];
 const looks=fit.parts.map(part=>{
  const src=part.material,m=src.clone();m.name='op-'+kit+'-'+src.name;m.userData.teamLook=true;m.transparent=false;m.depthWrite=true;m.alphaTest=0;m.side=THREE.DoubleSide;m.envMapIntensity=.45;
  if(mobileAssets)m.normalMap=null;for(const t of ['map','normalMap'])if(m[t])m[t].anisotropy=8;if(cfg.metal!==undefined)m.metalness*=cfg.metal;
  if(cfg.rough)m.roughness=Math.max(m.roughness,cfg.rough);
  // V44 op2 zones (LINCE): every part takes one look; the team colour is painted by body zones (chest and belly plates, thighs) with
  // soft 2 cm edges, so no jagged face-by-face rim; the rest is gunmetal; a faint mottle and worn sheen break the flat plastic.
  if(cfg.zones){const u={bodyTeam:{value:new THREE.Color().setRGB(...(cfg[team]||BODY_TEAM[team]),THREE.SRGBColorSpace)}};
   m.onBeforeCompile=shader=>{Object.assign(shader.uniforms,u);
    shader.vertexShader='varying vec3 vBodyP;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBodyP=position/1.1e6;');
    shader.fragmentShader='uniform vec3 bodyTeam;varying vec3 vBodyP;\nfloat bodyH(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}\nfloat bodyN(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(bodyH(i),bodyH(i+vec3(1,0,0)),f.x),mix(bodyH(i+vec3(0,1,0)),bodyH(i+vec3(1,1,0)),f.x),f.y),mix(mix(bodyH(i+vec3(0,0,1)),bodyH(i+vec3(1,0,1)),f.x),mix(bodyH(i+vec3(0,1,1)),bodyH(i+vec3(1,1,1)),f.x),f.y),f.z);}\n'+shader.fragmentShader
     .replace('#include <map_fragment>',`#include <map_fragment>
  {vec3 q=vBodyP;float ax=abs(q.x),e=.012;
  float torso=smoothstep(1.0-e,1.0+e,q.y)*(1.-smoothstep(1.4-e,1.4+e,q.y))*(1.-smoothstep(.17-e,.17+e,ax));
  float thigh=smoothstep(.5-e,.5+e,q.y)*(1.-smoothstep(.93-e,.93+e,q.y));
  float n=bodyN(q*38.)*.6+bodyN(q*95.)*.4,t=max(torso,thigh);
  vec3 metal=vec3(.07,.073,.08)*(.85+.3*n),paint=bodyTeam*(.62+.3*n);
  diffuseColor.rgb=mix(metal,paint,t);}`)
     .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=clamp(.48+.22*bodyN(vBodyP*60.),0.,1.);')
     .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\n metalnessFactor=.18;');};
   m.map=null;m.color.set(0xffffff);m.customProgramCacheKey=()=>'operator-body-v44-zones';m.needsUpdate=true;return m;}
  const role=/_Team/.test(src.name)?'team':'';
  if(role){const u={bodyTeam:{value:new THREE.Color().setRGB(...(cfg[team]||BODY_TEAM[team]),THREE.SRGBColorSpace)},bodyMix:{value:cfg.mix??1},bodyDetail:{value:cfg.detail||0},bodyGlow:{value:new THREE.Color(...BODY_GLOW[team])}};
   m.onBeforeCompile=shader=>{Object.assign(shader.uniforms,u);shader.fragmentShader='uniform vec3 bodyTeam;uniform float bodyMix;uniform float bodyDetail;uniform vec3 bodyGlow;\n'+shader.fragmentShader
    .replace('#include <map_fragment>','#include <map_fragment>\n  {float lum=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));float k=diffuseColor.a*bodyMix*smoothstep(.002,.012,lum);diffuseColor.rgb=mix(diffuseColor.rgb,bodyTeam*(1.5*mix(sqrt(lum),1.32*pow(lum,.75),bodyDetail)+.28*smoothstep(0.,.04,lum)),k);diffuseColor.a=1.;}')
    .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n  #ifdef USE_EMISSIVEMAP\n  totalEmissiveRadiance=bodyGlow*smoothstep(.08,.6,max(totalEmissiveRadiance.r,max(totalEmissiveRadiance.g,totalEmissiveRadiance.b)))*.8;\n  #endif');};
   if(/Glow/.test(src.name)&&!m.emissiveMap){m.emissive.setRGB(...BODY_GLOW[team]);m.emissiveIntensity=.8;}
   m.customProgramCacheKey=()=>'operator-body-v44-'+role;}
  m.needsUpdate=true;return m;
 });
 bodyLooks.set(key,looks);return looks;
}
// One copy of a body per operator, built the first time it wears that kit (dressOperator); geometry shared by every operator.
function attachBody(root,d,kit){
 const first=d.bodySkins[0];if(!first)return;const fit=bodyFit(kit,first);if(!fit)return;d.bodies??=new Map();
 d.bodies.set(kit,fit.parts.map(part=>{const m=new THREE.SkinnedMesh(part.geometry,bodyLook(kit,'blue')[0]);m.name=part.name;m.bind(first.skeleton,first.bindMatrix);m.position.copy(first.position);m.quaternion.copy(first.quaternion);m.scale.copy(first.scale);
  m.customDepthMaterial=skinDepth;m.castShadow=m.receiveShadow=true;m.frustumCulled=false;m.visible=false;m.userData.ownedGeometry=false;m.userData.armour=true;first.parent.add(m);return m;}));
}
// Phones load the half-size copies built by tools/build_mobile_assets.py: same paths under assets/mobile/.
// Phone layout of the viewmodels (set before any rig is built).
let touchView=false;export function useTouchViewmodels(){touchView=true;}
// V42: the OB-510 AVERLA rig is built for the new model unless the player picked the classic design.
let classicSniper=false;export function useClassicSniper(on){classicSniper=!!on;}
let mobileAssets=false;export function useMobileAssets(){mobileAssets=true;THREE.DefaultLoadingManager.setURLModifier(url=>/^(\.\/)?assets\/(models|textures)\/[^?]*\.(glb|wasm|webp)$/.test(url)?url.replace(/^(\.\/)?assets\//,'./assets/mobile/'):url);}
export const operatorDebug={operatorRest,gearTemplates,bodyFits};
// V42 bO: the regional kits' suits. The team colour stays the ground of the cloth (friend or foe at a glance); the region
// adds its own pattern over it, procedural on the suit's UVs (V43 oA: CRESTA's woodland and GHIBLI's dunes left with their kits; the
// shader keeps their branches, unused), ice
// splinters (BOREA). Plates and pouches take the region's tone over the team's. One program for all of them.
// `pat`: how much of the team colour the pattern's own patches carry. The desert and snow patterns are pale and close to
// the sand and the orange team's khaki, so their patches lean on the team colour too, and the regional team dyes are
// more saturated than the classic kits' (blue steel against rust): friend or foe at a glance on Sahra's sand and Forge's grey.
const REGIONS={borea:{kind:2,scale:13,colors:[[.86,.88,.88],[.58,.62,.64]],team:.86,pat:[.55,.45],plate:[.8,.82,.82]}};
const regionalLooks=new Map(),TEAM_FABRIC={blue:[[.2,.31,.43],[.22,.37,.53]],orange:[[.56,.32,.15],[.68,.39,.18]]};
export function regionalLook(base,team,kit){
 const key=base.uuid+':'+team+':'+kit;if(regionalLooks.has(key))return regionalLooks.get(key);
 const R=REGIONS[kit],armor=/Plate|Puches/.test(base.name),fabric=base.name==='Mil_Suit_R5';if(!R||!(armor||fabric)){regionalLooks.set(key,base);return base;}
 const m=base.clone();m.name=base.name+' '+kit;m.userData.teamLook=true;m.color.set(0xffffff);const tc=new THREE.Color().setRGB(...TEAM_FABRIC[team==='blue'?'blue':'orange'][armor?0:1],THREE.SRGBColorSpace);
 const mix=(c,k)=>new THREE.Color().setRGB(...c,THREE.SRGBColorSpace).lerp(tc,k);
 const uniforms={regGround:{value:armor?mix(R.plate,R.team*.85):tc.clone().lerp(mix(R.colors[0],0),1-R.team)},regA:{value:mix(R.colors[0],R.pat[0])},regB:{value:mix(R.colors[1],R.pat[1])},regScale:{value:R.scale},regKind:{value:armor?-1:R.kind}};
 m.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying float vOperatorY;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOperatorY=position.y;');
  shader.fragmentShader='uniform vec3 regGround;uniform vec3 regA;uniform vec3 regB;uniform float regScale;uniform float regKind;varying float vOperatorY;\nfloat regH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat regN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(regH(i),regH(i+vec2(1,0)),f.x),mix(regH(i+vec2(0,1)),regH(i+1.),f.x),f.y);}\nfloat regF(vec2 p){return regN(p)*.6+regN(p*2.3+7.)*.28+regN(p*5.1+3.)*.12;}\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  {float v=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)),0.,1.);vec3 c=regGround;
  #ifdef USE_MAP
  vec2 q=vMapUv*regScale;
  if(regKind<-.5){c=mix(regGround,regA,smoothstep(.55,.75,regF(q*.5))*.35);}
  else if(regKind<.5){float n=regF(q);c=n<.47?regGround:n<.6?regA:regB;}
  else if(regKind<1.5){float n=sin(q.y*2.2+regF(q*.6)*6.);c=n>.55?regA:n<-.75?regB:regGround;}
  else{vec2 r=mat2(.8,-.6,.6,.8)*q;float n=regH(floor(r*vec2(1.,2.6)));c=n<.58?regGround:n<.82?regA:regB;}
  #endif
  vec3 dyed=c*(.48+.85*sqrt(v));diffuseColor.rgb=mix(vec3(.075,.07,.062)*(.6+1.1*v),dyed,smoothstep(BOOT_TOP-BOOT_FADE,BOOT_TOP+BOOT_FADE,vOperatorY));}`);};
 m.defines={...base.defines,BOOT_TOP:'250000.0',BOOT_FADE:'15000.0'};m.customProgramCacheKey=()=>'operator-regional-v42';m.needsUpdate=true;
 regionalLooks.set(key,m);return m;
}
export const regionalKits=Object.keys(REGIONS);
// V43 oR: the classic kits wear their own cut (operator-wear.js) instead of the soldier's vest, pouches and pads: those skins
// hide, the pads skin keeps only its gloves, the suit takes the kit's colour blocking and one skinned mesh carries the wear.
const skinName=s=>(s.userData.baseMaterial||s.material).name;
function dressWear(d,team,look,armour){
 const kit=!armour&&WEAR_KITS.has(look.kit)?look.kit:null,skins=d.bodySkins||[],suit=skins.find(s=>skinName(s)==='Mil_Suit_R5'),head=skins.find(s=>/_Head$/.test(skinName(s)));
 for(const s of skins){const n=skinName(s);if(/Plate|Puches/.test(n))s.visible=!armour&&!kit;if(/Pads/.test(n)){s.userData.baseGeometry??=s.geometry;s.geometry=kit?glovesOnly(s):s.userData.baseGeometry;}if(kit&&s===suit)s.material=wearSuitLook(s.userData.baseMaterial,team,kit);if(kit&&s===head)s.material=wearHeadLook(s.userData.baseMaterial,team,kit);}
 // V43 oR rev: the suit takes the wear's tuck (pushed in under every panel) on a geometry sharing its attributes.
 if(suit)suit.userData.baseSuitGeometry??=suit.geometry;const geo=kit&&suit?wearGeometry(kit,look,suit,head):null;if(suit)suit.geometry=geo?wearSuitGeometry(geo,suit.userData.baseSuitGeometry):suit.userData.baseSuitGeometry;if(!geo){if(d.wear)d.wear.visible=false;return;}
 if(!d.wear){const m=new THREE.SkinnedMesh(geo,wearLook(team,look.accent));m.name='Operator wear';m.bind(suit.skeleton,suit.bindMatrix);m.position.copy(suit.position);m.quaternion.copy(suit.quaternion);m.scale.copy(suit.scale);
  m.customDepthMaterial=skinDepth;m.castShadow=m.receiveShadow=true;m.frustumCulled=suit.frustumCulled;if(suit.boundingSphere)m.boundingSphere=suit.boundingSphere.clone();m.userData.ownedGeometry=false;suit.parent.add(m);d.wear=m;}
 d.wear.geometry=geo;d.wear.material=wearLook(team,look.accent);d.wear.visible=true;
}
// V44 op2: kits whose closed helmet is part of their wear: the soldier's eyes hide under it.
const CLOSED_HELMETS=new Set(['mastino']);
export function dressOperator(root,team,operator){
 const d=root.userData;if(!d.bones||!operatorRest.frames)return;
 // V44: until its body has loaded a whole-body kit wears the ASSALTO kit in its accent; the key changes when it arrives.
 const look=cleanOperatorLook(operator),body=BODIES[look.kit]?look.kit:null,ready=!!body&&bodyReady(body);if(body&&!ready){loadBody(body);operator={...look,kit:'assalto'};}
 const key=operatorKey(team,operator);if(d.operatorKey===key)return;d.operatorKey=key;d.operatorKit=cleanOperatorLook(operator).kit;
 const old=[];root.traverse(o=>{if(o.userData.operatorGear)old.push(o);});for(const o of old)o.removeFromParent();
 const head=d.bones.get('Head'),shrink=headScale(operator);if(head){d.headRest??=head.scale.clone();head.scale.copy(d.headRest).multiplyScalar(shrink);}
 for(const {bone,group,local} of gearTemplate(team,operator)){const target=d.bones.get(bone);if(!target)continue;const clone=group.clone();clone.traverse(o=>{if(o.isMesh)o.userData.ownedGeometry=false;});local.decompose(clone.position,clone.quaternion,clone.scale);if(bone==='Head'){clone.position.divideScalar(shrink);clone.scale.divideScalar(shrink);}target.add(clone);}
 // The export's cap and headset skins serve the reconnaissance kit; they ride the shared skeleton.
 // The export's cap skin serves the reconnaissance kit (its headset is authored adrift of the cap and stays hidden).
 // V43 oR: the reconnaissance kit now wears its own field cap (operator-wear.js): the export's cap stays hidden on every kit.
 root.traverse(o=>{if(o.isSkinnedMesh&&/GreenCap/.test(o.material.name))o.visible=false;});
 // V44: a whole-body kit swaps the soldier's skins for its body on the same skeleton (d.armour: the body on show).
 if(ready&&!d.bodies?.has(body))attachBody(root,d,body);const armour=ready&&!!d.bodies?.has(body),looks=armour?bodyLook(body,team):null;d.armour=armour?d.bodies.get(body):null;
 for(const s of d.bodySkins||[]){s.visible=!armour;s.userData.baseMaterial??=s.material;s.material=REGIONS[look.kit]&&!armour?regionalLook(s.userData.baseMaterial,team,look.kit):s.userData.baseMaterial;}
 for(const [kit,list] of d.bodies||[])list.forEach((m,i)=>{m.visible=armour&&kit===body;if(m.visible&&looks?.[i])m.material=looks[i];});
 // The soldier's eyes are a rigid mesh on the head bone, not one of its skins: they hide with the soldier (V44: they showed through the visors).
 for(const o of d.bodyParts||[])o.visible=!armour&&!CLOSED_HELMETS.has(look.kit);
 dressWear(d,team,{...look,kit:cleanOperatorLook(operator).kit},armour);
 // V44 op2: bodies modelled without real hands (BODIES[kit].gloves) wear the soldier's gloves, whose fingers close on the
 // weapon, and heeled ones (boots) his boots: both cut out of his suit (operator-wear.js skinPart), the body's own shrunk inside.
 const suit=(d.bodySkins||[]).find(s=>skinName(s)==='Mil_Suit_R5'),cfg=armour?BODIES[body]:null;
 if(suit&&(cfg?.gloves||cfg?.boots)){const g=suit.userData.baseSuitGeometry||suit.geometry;
  if(!d.kitParts){d.kitParts=new THREE.SkinnedMesh(g,suit.material);d.kitParts.name='Operator gloves';d.kitParts.bind(suit.skeleton,suit.bindMatrix);d.kitParts.position.copy(suit.position);d.kitParts.quaternion.copy(suit.quaternion);d.kitParts.scale.copy(suit.scale);
   d.kitParts.userData.armour=true;d.kitParts.customDepthMaterial=skinDepth;d.kitParts.castShadow=d.kitParts.receiveShadow=true;d.kitParts.frustumCulled=false;d.kitParts.userData.ownedGeometry=false;suit.parent.add(d.kitParts);}
  const key=(cfg.gloves?'g':'')+(cfg.boots?'b':'');d.kitParts.geometry=skinPart(suit,g,key,(n,y)=>cfg.gloves&&/Hand/.test(n)||cfg.boots&&y<.262&&/Leg|Foot|Toe/.test(n));
  d.kitParts.material=kitPartsLook(suit.userData.baseMaterial||suit.material);d.kitParts.visible=true;}
 else if(d.kitParts)d.kitParts.visible=false;
}
// The gloves and boots under a whole body: the suit's own texture darkened to charcoal leather (no team dye: hands and feet stay dark).
const kitPartLooks=new Map();
function kitPartsLook(base){let m=kitPartLooks.get(base);if(m)return m;m=base.clone();m.name='op-gloves';m.userData.teamLook=true;m.color.set(0xffffff);
 m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n{float v=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)),0.,1.);diffuseColor.rgb=vec3(.075,.072,.068)*(.55+1.2*v);}');};
 m.defines={...base.defines};m.customProgramCacheKey=()=>'operator-gloves-v44';m.needsUpdate=true;kitPartLooks.set(base,m);return m;}
export function createAgent(team,weapon=3){
 const a=loaded.get('soldier_tac');if(!a)return null;
 const targetModel=tune(cloneSkeleton(a.scene),teamLooks[team]??=new Map()),tinted=tintedLooks;
 targetModel.traverse(o=>{
  if(!o.isMesh)return;const m=o.material;m.userData.teamLook=true;if(/HeadphonesT|GreenCap/.test(m.name)){o.visible=false;if(/GreenCap/.test(m.name)&&!tinted.has(m)){m.color.set(team==='blue'?0x55707c:0x9a7f5c);tinted.add(m);}}
  const armor=/Plate|Puches/.test(m.name),fabric=m.name==='Mil_Suit_R5';
  if((armor||fabric)&&!tinted.has(m)){
   // Retain photographed weave and folds while replacing the original green
   // garment dye. Skin, gloves, visor and neutral pads keep their own materials.
   const tint=new THREE.Color(team==='blue'?(armor?0x41586a:0x4d6a7e):(armor?0x8c7450:0xa58c6c));
   m.color.set(0xffffff);m.onBeforeCompile=shader=>{
    shader.uniforms.teamFabricTint={value:tint};shader.fragmentShader='uniform vec3 teamFabricTint;\n'+shader.fragmentShader;
    shader.vertexShader='varying float vOperatorY;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOperatorY=position.y;');shader.fragmentShader='varying float vOperatorY;\n'+shader.fragmentShader;
    // Boots stay dark leather whatever the team dye, so the figure is grounded and less like a toy.
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat fabricValue=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)),0.0,1.0);\nvec3 fabricDyed=teamFabricTint*(.48+.85*sqrt(fabricValue));\ndiffuseColor.rgb=mix(vec3(.075,.07,.062)*(.6+1.1*fabricValue),fabricDyed,smoothstep(BOOT_TOP-BOOT_FADE,BOOT_TOP+BOOT_FADE,vOperatorY));');
   };m.defines={...m.defines,BOOT_TOP:'250000.0',BOOT_FADE:'15000.0'};m.customProgramCacheKey=()=>'operator-fabric-v41';tinted.add(m);
  }
 });
 const root=new THREE.Group(),target=normalize(targetModel);root.add(target);batchSkins(target);
 // Posing order: every bone, and every node above a bone, top down. Each one's world
 // matrix is updated right after its own transform, so the solve below can read current
 // matrices without walking up the hierarchy again.
 const dst=[],bones=new Map(),rig=[],aboveBones=new Set();
 target.traverse(o=>{if(o.isBone)for(let n=o.parent;n&&n!==root&&!n.isBone;n=n.parent)aboveBones.add(n);});
 target.traverse(o=>{if(o.isBone){const key=boneKey(o.name),r={key,bone:o,rest:o.getWorldQuaternion(new THREE.Quaternion()),frame:poseFrame(key)};bones.set(key,o);dst.push(r);rig.push(r);}else if(aboveBones.has(o))rig.push({node:o});});
 const left={joints:['LeftForeArm','LeftArm'].map(n=>bones.get(n)).filter(Boolean),leftHand:bones.get('LeftHand')},right={joints:['RightForeArm','RightArm'].map(n=>bones.get(n)).filter(Boolean),leftHand:bones.get('RightHand')};
 left.restQ=gripOrientation(bones,'Left');{const m=bones.get('LeftHandMiddle1');left.palm=m?m.position.clone().multiplyScalar(.55):null;}right.restQ=gripOrientation(bones,'Right');{const m=bones.get('RightHandMiddle1');right.palm=m?m.position.clone().multiplyScalar(.55):null;}
 const feet=[bones.get('LeftFoot'),bones.get('RightFoot')].filter(Boolean),legs=['Left','Right'].map(side=>({side,joints:[bones.get(side+'Leg'),bones.get(side+'UpLeg')],leftHand:bones.get(side+'Foot'),rest:bones.get(side+'Foot').getWorldQuaternion(new THREE.Quaternion())})),sole=Math.min(...feet.map(f=>f.getWorldPosition(new THREE.Vector3()).y));
 // V42 bO: the finger joints of both hands, each with its bend axis in its own frame (across the palm, index to little finger).
 const fingers={Left:[],Right:[]};for(const side of ['Left','Right']){const i1=bones.get(side+'HandIndex1'),p1=bones.get(side+'HandPinky1');if(!i1||!p1)continue;const across=i1.getWorldPosition(new THREE.Vector3()).sub(p1.getWorldPosition(new THREE.Vector3())).normalize();if(side==='Left')across.negate();
  for(const f of ['Index','Middle','Ring','Pinky','Thumb'])for(let j=1;j<=3;j++){const bone=bones.get(side+'Hand'+f+j);if(bone)fingers[side].push({bone,f,j,axis:across.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize(),q:new Map()});}}
 const shadow=contactShadow();root.add(shadow);
 root.userData={fingers,target,dst,rig,bones,weights:locomotionWeights(0),left,right,feet,legs,gaitPhase:0,sole,shadow,baseY:target.position.y,groundShift:0,bodyOffset:0,recoil:0,impact:0,
  poseRootQ:new THREE.Quaternion(),chestQ:new THREE.Quaternion(),poseSourceQ:new THREE.Quaternion(),poseParentQ:new THREE.Quaternion(),lowerQ:new THREE.Quaternion(),upperQ:new THREE.Quaternion(),headQ:new THREE.Quaternion(),spineQ:new THREE.Quaternion(),spine1Q:new THREE.Quaternion(),gunQ:new THREE.Quaternion(),tempQ:new THREE.Quaternion(),tempV:new THREE.Vector3(),
  weaponModels:new Map(),weapon:-1,gun:null,wrist:bones.get('RightHand'),wasReload:false,reloadStart:0,bodySkins:[]};
 target.traverse(o=>{if(o.isSkinnedMesh&&o.visible)root.userData.bodySkins.push(o);else if(o.isMesh&&o.visible&&/^Mil_Suit/.test(o.material?.name))(root.userData.bodyParts??=[]).push(o);});bodyBase??=root.userData.bodySkins[0]||null;warmBody??=root.userData.bodySkins.slice();
 captureOperatorRest(root,bones);dressOperator(root,team,DEFAULT_OPERATOR);attachWeapon(root,weapon);cullOperator(root);return root;
}
// The pose frame of each bone, chosen by name once instead of by regex every frame.
const poseFrame=key=>/Hips|Leg|Foot|Toe/.test(key)?'lowerQ':key==='Spine'?'spineQ':key==='Spine1'?'spine1Q':key==='Spine2'?'chestQ':/Head|Neck/.test(key)?'headQ':/Arm|Hand|Shoulder|Thumb|Index|Middle|Ring|Pinky/.test(key)?'upperQ':'poseRootQ';
export function prepareAgentEquipment(root){const d=root.userData;if(!d.weaponModels)return;const selected=d.weapon;for(let i=0;i<6;i++)attachWeapon(root,i);attachWeapon(root,selected);}
// V34: an operator's held weapon is drawn in as few calls as its materials allow (the
// The pistol export splits its frame into 12 meshes and its slide into 3, the knife has 8
// rings) and is frustum culled like any rigid mesh. Drops and the armory keep the
// plain display model.
function agentWeapon(index){
 const gun=createDisplayWeapon(index,true);if(!gun)return gun;
 const parents=[];gun.traverse(o=>{if(o.children.length>1)parents.push(o);});for(const o of parents)batchParts(o);
 gun.traverse(o=>{if(o.isMesh)o.frustumCulled=true;});return gun;
}
function attachWeapon(root,index){
 const d=root.userData;if(d.weapon===index||!d.wrist)return;d.gun?.removeFromParent();if(!d.weaponModels.has(index))d.weaponModels.set(index,agentWeapon(index));d.gun=d.weaponModels.get(index);if(!d.gun)return;d.wrist.add(d.gun);
 if(!d.gun.userData.flash){const socket=muzzleOf(d.gun);if(socket){const f=new THREE.Mesh(new THREE.ConeGeometry(.045,.16,6),new THREE.MeshBasicMaterial({color:0xffdfab,transparent:true,opacity:.85,depthWrite:false}));f.rotation.x=-Math.PI/2;f.position.z=-.055;f.visible=false;socket.add(f);d.gun.userData.flash=f;}}
 const mag=d.gun.userData.magazine??=d.gun.getObjectByName('Magazine')||null;if(mag&&!d.gun.userData.magRest)d.gun.userData.magRest=mag.position.clone();d.weapon=index;
}
function orientGrip(arm,orientation){if(!arm.restQ)return;arm.leftHand.quaternion.copy(freshQuaternion(arm.leftHand.parent,ikQ[4]).invert().multiply(orientation).multiply(arm.restQ));arm.leftHand.updateWorldMatrix(false,false);}
// V42 bO: a wrist turned palm up under a fore-end twisted only the hand bone, and the skin between forearm and hand wrung
// like a candy wrapper (CORAZZA's plates streaked). Part of the hand's twist about the forearm goes to the forearm itself, as
// the radius does: the hand stays exactly where it is, both ends of the forearm turn by half.
const twistV=new THREE.Vector3(),twistQ=new THREE.Quaternion();
function spreadTwist(arm,share=.55){const hand=arm.leftHand,fore=hand?.parent;if(!fore||!fore.isBone)return;
 const axis=twistV.copy(hand.position).normalize(),q=hand.quaternion,d=axis.x*q.x+axis.y*q.y+axis.z*q.z;let angle=2*Math.atan2(d,q.w);if(angle>Math.PI)angle-=Math.PI*2;else if(angle<-Math.PI)angle+=Math.PI*2;
 twistQ.setFromAxisAngle(axis,angle*share);fore.quaternion.multiply(twistQ);hand.quaternion.premultiply(twistQ.invert());fore.updateWorldMatrix(false,false);hand.updateWorldMatrix(false,false);}
const poseV=Array.from({length:6},()=>new THREE.Vector3());
// V43 b34: the support hand's throw (agent-gear.js throwPhase): its goal and elbow side blended over the hold's.
const throwQ=new THREE.Quaternion(),hangQ=new THREE.Quaternion(),throwV=[new THREE.Vector3(),new THREE.Vector3()];
function throwReach(root,rootQ,th,goal,pole,duck){const t=throwV[0].copy(th.hand);t.y-=duck*.48;goal.lerp(t.applyQuaternion(rootQ).add(root.position),th.w);pole.lerp(throwV[1].copy(th.pole).applyQuaternion(rootQ),th.w);}
export function animateAgent(root,dt,moving,weapon=3,speed=4.7,pose={}){
 const d=root.userData;if(!d.bones)return false;
 if(pose.life!==undefined&&pose.life!==d.life){d.life=pose.life;d.bodyOffset=0;d.groundShift=0;d.gaitPhase=0;d.wasReload=false;d.recoil=d.impact=0;d.plants={};}
 const gait=gaitDirection(root.rotation.y,pose.vx||0,pose.vz||0),weights=locomotionWeights(speed),blend=1-Math.exp(-12*dt);
 d.bodyOffset+=(gait.offset-d.bodyOffset)*blend;
 for(const mode of ['idle','walk','run'])d.weights[mode]+=(weights[mode]-d.weights[mode])*blend;
 const time=pose.time??performance.now(),reloading=!!pose.reloading;
 if(reloading&&!d.wasReload)d.reloadStart=time;d.wasReload=reloading;
 const progress=reloading?THREE.MathUtils.clamp(pose.reloadProgress??(time-d.reloadStart)/((pose.reloadDuration||2)*1000),0,1):0,reloadWeight=reloading?Math.sin(Math.PI*progress):0;
 d.recoil*=Math.exp(-22*dt);d.impact*=Math.exp(-14*dt);
 // V41 weight: the torso leans into a run and into a strafe and breathes at rest. Only the bones
 // move: speed, aim and the shot origin come from the rules, not from this pose.
 const yawNow=root.rotation.y,forward=-((pose.vx||0)*Math.sin(yawNow)+(pose.vz||0)*Math.cos(yawNow)),strafe=(pose.vx||0)*Math.cos(yawNow)-(pose.vz||0)*Math.sin(yawNow);
 d.leanForward=(d.leanForward||0)+(THREE.MathUtils.clamp(forward/5,-.6,1)*.1-(d.leanForward||0))*blend;d.leanSide=(d.leanSide||0)+(THREE.MathUtils.clamp(strafe/5,-1,1)*.075-(d.leanSide||0))*blend;
 const breath=Math.sin(time*.0019+root.id)*.014*d.weights.idle,side=d.leanSide;
 const pitch=THREE.MathUtils.clamp(pose.pitch||0,-1.15,1.15),upperPitch=pitch*.45-reloadWeight*.32+d.recoil*.025-d.impact*.12-d.leanForward+breath;
 d.plants??={};const oldX=d.plants.x??root.position.x,oldZ=d.plants.z??root.position.z;d.gaitPhase+=Math.hypot(root.position.x-oldX,root.position.z-oldZ)*Math.PI/.8;
 const duck=THREE.MathUtils.clamp(pose.duck||0,0,1);
 // V34: the skeleton is posed top down with fresh world matrices (see `rig`), and only
 // what the solve reads afterwards is kept current: the renderer's scene update
 // recomputes every node before drawing, so equipment, skins and fingers wait for it.
 // Same joint rotations as walking each read up to the root, at a fraction of the cost.
 d.target.position.y=d.baseY-duck*STANCE.drop-(RUN_SINK+(.5-.5*Math.cos(d.gaitPhase*2))*.012)*Math.min(1,speed/3);root.updateWorldMatrix(true,false);const rootQ=freshQuaternion(root,d.poseRootQ),axisX=d.tempV.set(1,0,0);
 // V43 b34: a grenade just thrown (its age in ms): the torso turns into the throw, the support hand throws, the gun drops.
 const th=reloading?null:throwPhase(pose.throwAge,weapon===5),rt=!!th&&weapon!==5,twist=th?th.twist*th.w:0,axisY=poseV[2].set(0,1,0);
 d.upperQ.copy(rootQ).multiply(d.tempQ.setFromAxisAngle(axisY,twist)).multiply(d.tempQ.setFromAxisAngle(axisX,upperPitch)).multiply(d.tempQ.setFromAxisAngle(poseV[3].set(0,0,1),-side));d.headQ.copy(rootQ).multiply(d.tempQ.setFromAxisAngle(axisX,pitch*.85));
 d.spineQ.copy(rootQ).multiply(d.tempQ.setFromAxisAngle(axisY,twist*.3)).multiply(d.tempQ.setFromAxisAngle(axisX,upperPitch*.3));d.spine1Q.copy(rootQ).multiply(d.tempQ.setFromAxisAngle(axisY,twist*.65)).multiply(d.tempQ.setFromAxisAngle(axisX,upperPitch*.65));d.chestQ.copy(rootQ);if(twist)d.chestQ.multiply(d.tempQ.setFromAxisAngle(axisY,twist*.9));
 d.lowerQ.copy(rootQ).multiply(d.tempQ.setFromAxisAngle(d.tempV.set(0,1,0),d.bodyOffset));
 for(const r of d.rig){
  if(!r.bone){r.node.updateWorldMatrix(false,false);continue;}
  const q=d.poseSourceQ.copy(r.rest).premultiply(d[r.frame]),parent=freshQuaternion(r.bone.parent,d.poseParentQ).invert();r.bone.quaternion.copy(parent.multiply(q));r.bone.updateWorldMatrix(false,false);
 }
 // Procedural two-bone leg solve keeps feet under the body instead of adding
 // the source character's wide stance to the target character's rest pose.
 const plants=footPlants(d.plants,{x:root.position.x,z:root.position.z,y:root.position.y,groundY:pose.groundY||0,yaw:root.rotation.y+d.bodyOffset,speed,life:d.life,sole:d.sole},dt);
 for(let n=0;n<d.legs.length;n++){
  const leg=d.legs[n],plant=plants[n],foot=(d.legTarget??=new THREE.Vector3()).set(plant.x,plant.y,plant.z);
  solveHand(leg,foot,poseV[0].set(n===0?-.12:.12,0,-1).applyQuaternion(d.lowerQ),true);
  const desired=d.tempQ.copy(d.lowerQ).multiply(leg.rest),inverse=freshQuaternion(leg.leftHand.parent,d.poseParentQ).invert();leg.leftHand.quaternion.copy(inverse.multiply(desired));leg.leftHand.updateWorldMatrix(false,true);
 }
 d.gunQ.copy(rootQ).multiply(d.tempQ.setFromAxisAngle(d.tempV.set(1,0,0),pitch-reloadWeight*(weapon===0?.42:.26)+d.recoil*.035-(th&&!rt?th.lower*.6:0)));
 // V42 bO: a reload keeps the hands in front of the vest (they used to sink into the pouches); the pistol stays up, the long guns
 // come out in front of the chest, muzzle lower, so the stock and the right forearm clear the magazine pouches.
 const trigger=poseV[1].set(.16-reloadWeight*.035-(weapon===5?d.recoil*.12:0),-.025-reloadWeight*(weapon===0?.0:.06),(weapon===4?-.05:weapon===0?-.15:weapon===5?-.13:-.08)+reloadWeight*(weapon===0?-.06:weapon===4?-.04:-.1)-(weapon===5?d.recoil*.12:0)).applyQuaternion(d.upperQ).add(poseV[2].set(0,1.44-duck*.48,0).applyQuaternion(rootQ)).add(root.position);
 // V43 b34 rev: the right hand throws (the gun goes down onto the sling in the support hand, below); the knife's left hand throws.
 const rpole=poseV[0].set(.45,-.7,.2).applyQuaternion(rootQ);if(rt)throwReach(root,rootQ,th,trigger,rpole,duck);
 solveHand(d.right,trigger,rpole,true);const rfree=rt&&throwQ.copy(d.right.leftHand.quaternion);orientGrip(d.right,d.gunQ);if(rfree){d.right.leftHand.quaternion.slerp(rfree,th.w);d.right.leftHand.updateWorldMatrix(false,false);}spreadTwist(d.right);
 if(rt)d.gunQ.slerp(hangQ.copy(rootQ).multiply(d.tempQ.setFromAxisAngle(axisY.set(0,1,0),.55)).multiply(d.tempQ.setFromAxisAngle(d.tempV.set(1,0,0),-1.1)),th.w);
 d.shadow.material.opacity=.20*Math.max(0,1-Math.max(0,root.position.y-(pose.groundY||0))*2);d.shadow.position.y=(pose.groundY||0)-root.position.y+.014;d.shadow.scale.set(1+speed*.025,1+speed*.025,1);
 attachWeapon(root,weapon);
 if(d.gun){
  const inverse=freshQuaternion(d.wrist,d.poseParentQ).invert();d.gun.quaternion.copy(inverse).multiply(d.gunQ);
  const scale=freshScale(d.wrist,d.tempV),worldScale=d.gun.userData.worldScale||.5;d.gun.scale.set(worldScale/scale.x,worldScale/scale.y,worldScale/scale.z);
  const wrist=freshPosition(d.wrist,poseV[3]),offset=poseV[4].copy(d.gun.userData.trigger).multiplyScalar(worldScale).applyQuaternion(d.gunQ);
  const palm=poseV[5].set(-.025,-.055,-.035+d.recoil*.025).applyQuaternion(d.gunQ);
  wrist.add(palm).sub(offset);if(rt)wrist.lerp(poseV[5].set(.04,1.08-duck*.48,-.27).applyQuaternion(rootQ).add(root.position).sub(offset),th.w);
  d.gun.position.copy(d.wrist.worldToLocal(wrist));
  const mag=d.gun.userData.magazine;if(mag&&d.gun.userData.magRest){mag.position.copy(d.gun.userData.magRest);mag.position.y-=reloadWeight*.13;mag.visible=!reloading||progress<.3||progress>.58;}
  if(weapon!==5){
   d.gun.updateWorldMatrix(false,true);const grip=d.leftGripTarget??=new THREE.Vector3();
   // V42 bO: with a hold the palm, not the wrist, lands on the gun: the wrist goal is the contact less the palm's offset in the hand's final turn.
   // A reload turns the palm to face the magazine (fingers round it) and, while the old one is out, fetches a fresh one
   // from the vest's front pouch.
   const reach=reloading&&mag?Math.sin(Math.PI*THREE.MathUtils.clamp((progress-.12)/.74,0,1)):0;d.leftReach=reach;
   const hold=d.gun.userData.hold,roll=(hold?.roll||0)*(1-reach)-1.3*reach,holdQ=d.left.palm?(d.holdQ??=new THREE.Quaternion()).copy(d.gunQ).multiply(d.tempQ.setFromAxisAngle(d.tempV.set(0,0,1),roll)):null;
   if(hold&&holdQ){grip.set(hold.at[0],hold.at[1],hold.at[2]);d.gun.localToWorld(grip);const s=freshScale(d.left.leftHand,d.tempV).x;grip.sub(poseV[0].copy(d.left.palm).multiplyScalar(s).applyQuaternion(d.tempQ.copy(holdQ).multiply(d.left.restQ)));}
   else if(d.gun.userData.support)grip.copy(d.gun.userData.support),d.gun.localToWorld(grip);
   else freshPosition(d.wrist,grip).add(poseV[0].set(-.05,-.025,-.01).applyQuaternion(d.gunQ));
   if(reach>0){const magGrip=(d.magGripTarget??=new THREE.Vector3());freshPosition(mag,magGrip);magGrip.add(poseV[1].set(-.03,-.015,0).applyQuaternion(d.gunQ));
    const fetch=THREE.MathUtils.smoothstep(progress,.27,.37)*(1-THREE.MathUtils.smoothstep(progress,.49,.59));if(fetch>0)magGrip.lerp(poseV[1].set(-.06,1.21-duck*.48,-.27).applyQuaternion(rootQ).add(root.position),fetch);grip.lerp(magGrip,reach);}
   const pole=poseV[2].set(-.2,-.5,.05).applyQuaternion(rootQ);if(th&&!rt)throwReach(root,rootQ,th,grip,pole,duck);
   solveHand(d.left,grip,pole,true);const free=th&&!rt&&throwQ.copy(d.left.leftHand.quaternion);orientGrip(d.left,holdQ||d.gunQ);if(free){d.left.leftHand.quaternion.slerp(free,th.w);d.left.leftHand.updateWorldMatrix(false,false);}spreadTwist(d.left);
  }
 }
 if(weapon===5){const standby=poseV[3].set(-.24,1.17-duck*.48,-.16).applyQuaternion(rootQ).add(root.position),pole=poseV[4].set(-.3,-.7,.05).applyQuaternion(rootQ);if(th)throwReach(root,rootQ,th,standby,pole,duck);solveHand(d.left,standby,pole,true);}
 if(d.fingers){curlFingers(d.fingers.Right,rt&&th.w>.3&&th.open?'open':weapon===5?'knife':'trigger');curlFingers(d.fingers.Left,th&&!rt&&th.w>.3&&(th.carry||th.open)?(th.carry?'wrap':'open'):weapon===5?'guard':d.gun?.userData.hold?.roll||d.leftReach>.4?'wrap':'fore');}
 // V43 b34 rev: the throwing hand's palm, every pose (a can this body throws is first drawn there, utility-presentation.js):
 // the right hand, or the left with the knife. The can is not shown in the hand (the release is the grenade's birth).
 {const arm=weapon===5?d.left:d.right;if(arm.palm)heldCan(root,arm.leftHand,poseV[3].copy(arm.palm),pose.throwKind,!!th&&th.carry&&th.w>.05);}
 dressAgentGear(root,dt,d.operatorKit);
 if(d.gun?.userData.flash)d.gun.userData.flash.visible=performance.now()<(d.flashUntil||0);
 return true;
}
// V42 bO: how far each joint of a finger closes (radians, joints 1-3) in each hold. The right index rests along the trigger
// guard; a pistol's support hand wraps the shooting hand; under a fore-end the fingers close up its side.
const CURL={trigger:{Index:[.3,.45,.3],Middle:[1.05,1.15,.75],Ring:[1.1,1.15,.75],Pinky:[1.15,1.1,.7],Thumb:[.25,.35,.25]},knife:{Index:[1,1.1,.7],Middle:[1.1,1.15,.75],Ring:[1.15,1.15,.75],Pinky:[1.2,1.1,.7],Thumb:[.35,.45,.3]},
 fore:{Index:[.8,.85,.55],Middle:[.9,.95,.6],Ring:[.95,.95,.6],Pinky:[1,.95,.6],Thumb:[.2,.25,.2]},wrap:{Index:[.85,.95,.6],Middle:[.95,1,.65],Ring:[1,1,.65],Pinky:[1.05,1,.65],Thumb:[.2,.3,.2]},open:{Index:[.35,.4,.3],Middle:[.4,.45,.3],Ring:[.45,.45,.3],Pinky:[.5,.45,.3],Thumb:[.1,.15,.1]},
 // the free hand beside a knife: a loose guarding fist, not a claw.
 guard:{Index:[.95,1.05,.7],Middle:[1.05,1.1,.75],Ring:[1.1,1.1,.75],Pinky:[1.15,1.05,.7],Thumb:[.3,.4,.3]}};
function curlFingers(list,kind){for(const r of list){let q=r.q.get(kind);if(!q){q=new THREE.Quaternion().setFromAxisAngle(r.axis,CURL[kind][r.f][r.j-1]);r.q.set(kind,q);}r.bone.quaternion.multiply(q);}}
export function flashAgent(root){root.userData.flashUntil=performance.now()+45;root.userData.recoil=1;}
export function reactAgent(root){root.userData.impact=1;}
export function relaxAgent(root){
 const d=root.userData;if(!d.bones)return;root.updateMatrixWorld(true);
 const q=root.getWorldQuaternion(new THREE.Quaternion()),origin=root.getWorldPosition(new THREE.Vector3());
 for(const [arm,sign]of [[d.left,-1],[d.right,1]]){
  const target=new THREE.Vector3(sign*.32,.94,sign*.035).applyQuaternion(q).add(origin);
  solveHand(arm,target,new THREE.Vector3(sign*.45,-.2,.2).applyQuaternion(q));root.updateMatrixWorld(true);
 }
}
export function disposeAgent(root){
 const d=root.userData,materials=new Set(),geometries=new Set(),skeletons=new Set();
 const collect=o=>{if(o.isSkinnedMesh&&o.skeleton)skeletons.add(o.skeleton);if(o.isMesh){for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);if(o.userData.ownedGeometry)geometries.add(o.geometry);}};
 root.traverse(collect);for(const g of d.weaponModels?.values()||[])g?.traverse(collect);
 for(const m of materials)if(!m.userData.teamLook)m.dispose();for(const g of geometries)g.dispose();
 for(const skeleton of skeletons)skeleton.dispose();
 // GLB geometry stays shared; only equipment and contact-shadow geometry is owned here.
 d.mixer?.stopAllAction();if(d.source)d.mixer?.uncacheRoot(d.source);
 root.removeFromParent();
}
