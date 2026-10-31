import {inspectionPose,reloadPose} from './weapon-inspection.js?v=38.3';
import {readableAlbedo} from './surface-detail.js?v=38.3';
import {prepareKits} from './weapon-kits.js?v=38.3';
import {createKnife} from './knife.js?v=38.3';
import {buildGear,operatorKey,DEFAULT_OPERATOR,preloadOperatorGear} from './operator-kits.js?v=38.3';
import {footPlants} from './agent-locomotion.js?v=38.3';
import * as THREE from './vendor/three.module.js';
import {locomotionWeights,gaitDirection} from './agent-motion.js?v=38.3';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/addons/libs/meshopt_decoder.module.js';
import {clone as cloneSkeleton} from './vendor/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),loaded=new Map();
const files=['p226','mp5a5','ak47','m4a1','m24','soldier_tac'];
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
function tune(model,materials=new Map()){
 model.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;o.castShadow=o.receiveShadow=true;
  const original=o.material;if(!materials.has(original))materials.set(original,original.clone());o.material=materials.get(original);
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
export function createDisplayWeapon(index){
 if(index===5){const knife=createKnife();prepareKits(knife,index);return knife;}
 const m=rig(index);if(!m)return null;m.updateMatrixWorld(true);const gun=m.getObjectByName('Gun_'+files[index]);if(!gun)return null;
 const marker=name=>{const o=m.getObjectByName(name);return o?gun.worldToLocal(o.getWorldPosition(new THREE.Vector3())):null;};
 gun.userData.support=marker('GripL');if(gun.userData.support){gun.userData.support.x-=.16;gun.userData.support.y-=.10;if([2,4].includes(index))gun.userData.support.z+=.08;}gun.userData.trigger=marker('GripR')||new THREE.Vector3(0,.012,.295);
 gun.removeFromParent();gun.scale.multiplyScalar(.5);gun.userData.worldScale=gun.scale.x;
 prepareKits(gun,index);return gun;
}
export function createArmedModel(index){
 if(index===5){
  const root=createArmedModel(0);if(!root)return null;const d=root.userData,old=d.gun;root.updateMatrixWorld(true);
  const grip=root.getObjectByName('GripR'),point=grip?.getWorldPosition(new THREE.Vector3())||old.getWorldPosition(new THREE.Vector3());
  old.visible=false;d.flash.visible=false;d.mag=null;d.bolt=null;d.index=5;d.knife=createKnife();prepareKits(d.knife,5);d.knife.rotation.x=.52;d.knife.position.copy(root.worldToLocal(point));root.add(d.knife);d.knifeGrip=grip;d.hip.add(new THREE.Vector3(.025,-.015,-.025));return root;
 }
 const model=rig(index);if(!model)return null;
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.add(model);model.scale.setScalar(.5);
 const data=JSON.parse(model.children[0]?.userData.fp||'{}');
 // Authored grip and wrist pose, positioned in camera space at real-world scale.
 const hip=data.hip||{pos:[.068,.144,-.052],boreRef:[0,-.1475,.055]},r=hip.boreRef;
 root.userData.hip=new THREE.Vector3(hip.pos[0]-r[0],hip.pos[2]-r[2],-hip.pos[1]+r[1]);
 if(index===4)root.userData.hip.add(new THREE.Vector3(.005,-.025,-.12));
 const gun=model.getObjectByName('Gun_'+files[index]);const socket=model.getObjectByName('MuzzleSocket');
 const flash=new THREE.Group();const f=new THREE.Mesh(new THREE.ConeGeometry(.025,.12,6),new THREE.MeshBasicMaterial({color:0xffdab0,transparent:true,opacity:.9,depthWrite:false}));f.rotation.x=-Math.PI/2;f.position.z=-.04;flash.add(f);if(socket)socket.add(flash);else gun.add(flash);flash.visible=false;
 const mag=model.getObjectByName('Magazine'),bolt=model.getObjectByName('ChargingHandle');
 const leftHand=model.getObjectByName('Hand_L'),joints=['Forearm_L','UpArm_L'].map(n=>model.getObjectByName(n)).filter(Boolean);
 const leftAnchor=model.getObjectByName('Arm_L'),leftAnchorRest=leftAnchor?.position.clone();const rest=joints.map(n=>n.quaternion.clone());const leftRest=leftHand?.quaternion.clone();
 const rightHand=model.getObjectByName('Hand_R'),rightAnchor=model.getObjectByName('Arm_R'),rightJoints=['Forearm_R','UpArm_R'].map(n=>model.getObjectByName(n)).filter(Boolean);
 const fpLeft={leftHand,leftAnchor,leftAnchorRest,joints,rest,leftRest};
 const fpRight={leftHand:rightHand,leftAnchor:rightAnchor,leftAnchorRest:rightAnchor?.position.clone(),joints:rightJoints,rest:rightJoints.map(n=>n.quaternion.clone()),leftRest:rightHand?.quaternion.clone()};
 root.userData={...root.userData,fpRight,body,model,gun,flash,index,mag,magRest:mag?.position.clone(),bolt,boltRest:bolt?.position.clone(),boltRestQ:bolt?.quaternion.clone(),fpScratch:Array.from({length:8},()=>new THREE.Vector3()),leftHand,joints,rest,leftRest,leftAnchor,leftAnchorRest,reloadStart:0,wasReload:false};prepareKits(gun,index);root.userData.fpArms=[fpLeft,fpRight];root.updateMatrixWorld(true);// Rest landmarks for the V32 rig: grip pivot, hand bones, forearm wrist points and the
 // support hand's offset from its fore-end grip, all in the rig's own (rest) frame.
 const at=n=>{const o=model.getObjectByName(n);return o?root.worldToLocal(o.getWorldPosition(new THREE.Vector3())):null;},d=root.userData;
 d.pivot=at('GripR');d.gunRest={position:gun.position.clone(),quaternion:gun.quaternion.clone(),scale:gun.scale.clone()};
 d.magSocket=model.getObjectByName('MagazineGripSocket')||model.getObjectByName('MagazineGrip')||mag;d.port=model.getObjectByName('EjectionPort');
 // Palm point: between the wrist and the fingertips of the support hand at rest.
 if(leftHand){const wrist=root.worldToLocal(leftHand.getWorldPosition(new THREE.Vector3())),tips=[];leftHand.traverse(o=>{if(/^Bone_L.?0(07|11|15)/.test(o.name)&&/end/.test(o.name))tips.push(root.worldToLocal(o.getWorldPosition(new THREE.Vector3())));});
  const palm=(tips.length?tips.reduce((a,b)=>a.add(b),new THREE.Vector3()).multiplyScalar(1/tips.length).lerp(wrist,.45):wrist.clone());d.gripOffset=wrist.clone().sub(palm);}
 for(const arm of d.fpArms)if(arm.leftHand&&arm.joints.length===2){arm.handPosRest=arm.leftHand.position.clone();arm.wristLocal=arm.joints[0].worldToLocal(arm.leftHand.getWorldPosition(new THREE.Vector3()));}return root;
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
const hv=new THREE.Vector3(),hq=new THREE.Quaternion(),wq=new THREE.Quaternion(),aq=new THREE.Quaternion(),pv=Array.from({length:8},()=>new THREE.Vector3());
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
 // M24 reload: the thumb over the open port.
 port:{at:[-.012,.03,.0],turn:[.3,0,2.2]},
 // MP5 cocking handle: an overhand slap from above.
 handle:{at:[-.01,.022,.03],turn:[.2,0,2.4]},
 // M24 inspection: the hand runs forward along the fore-end (bolt channel = the slide)
 // instead of climbing to the scope, which put the whole forearm across the rifle.
 front:{at:[0,-.004,-.02],turn:[0,0,0],slide:-.09}
};
const workPart=(d,kind)=>kind==='scope'||kind==='port'?d.port:kind==='handle'?d.bolt:d.magSocket;
function inspectRig(root,d,ip,w){
 const rq=root.getWorldQuaternion(rigQ[1]),rqi=rigQ[0].copy(rq).invert(),p=d.pivot,R=rigQ[2].setFromEuler(rigE.set(ip.pitch*w,ip.yaw*w,ip.roll*w,'YXZ'));
 // Long guns are held further out when turned, so the whole piece stays in the frame.
 const turned=Math.min(1,(Math.abs(ip.yaw)+Math.abs(ip.roll))/.5)*w,out=(d.index===2?.09:d.index===1?.04:.015)*turned,down=(d.index===2?.045:0)*turned;
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
  const aim=(kind,pos,q)=>{const work=WORK[kind],part=workPart(d,kind),turn=hq.setFromEuler(rigE.set(work.turn[0],work.turn[1],work.turn[2],'YXZ'));
   q.copy(rq).multiply(R).multiply(turn).multiply(rqi).multiply(handQ);
   const at=(d.workAt??=new THREE.Vector3()).fromArray(d.index===0&&kind==='mag'?PISTOL_MAG:work.at).applyQuaternion(R).applyQuaternion(rq);
   // A part is reached palm first (wrist offset turned with the hand); a point along the
   // fore-end is measured from the wrist as it rides, so no palm offset applies.
   if(part)part.getWorldPosition(pos).add(at).add(offset.copy(d.gripOffset||offset.set(-.04,-.01,.05)).applyQuaternion(turn).applyQuaternion(R).applyQuaternion(rq));else pos.copy(ridePos).add(at);};
  const kind=ip.work||(d.index===4?'front':'mag');aim(kind,workPos,workQ);
  // A wrist twist works the scope turret, a click at a time; the thumb presses rounds in;
  // along the fore-end the hand slides toward the muzzle and back.
  if(kind==='scope')workQ.multiply(hq.setFromAxisAngle(pv[6].set(0,0,1),ip.bolt*w*.5));
  if(kind==='port')workPos.add(pv[6].set(0,-.028*ip.mag,0).applyQuaternion(R).applyQuaternion(rq));
  if(kind==='front')workPos.add(pv[6].set(0,0,WORK.front.slide*ip.bolt*w).applyQuaternion(R).applyQuaternion(rq));
  if(ip.alt>.001&&d.bolt){const altPos=pv[7];aim('handle',altPos,aq);workPos.lerp(altPos,ip.alt);workQ.slerp(aq,ip.alt);}
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
export function animateViewmodel(root,{time,moving,aim,recoil,reloading,reloadDuration=2,inspecting=false,inspectPose=null,cycling=0,dt,reloadTime=time,motion={},switchLower=0,strike=0,heavy=false,empty=false}){
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
 const cycle=cycling>0?Math.sin(Math.PI*cycling):0;const roll=cycle*.16,pitch=recoil*.8+cycle*.07+switchLower*.45+(d.index===5?slash*.45:0);target.y-=cycle*.035;
 // Spring kick is layered on top of the smoothed base pose and removed before smoothing again.
 const kick=motion.kick,applied=d.appliedKick??={x:0,y:0,z:0,pitch:0,yaw:0,roll:0};
 root.position.x-=applied.x;root.position.y-=applied.y;root.position.z-=applied.z;root.rotation.x-=applied.pitch;root.rotation.y-=applied.yaw;root.rotation.z-=applied.roll;
 const rollGoal=roll+(motion.roll||0)-switchLower*.35-(d.index===5?slash*.65:0);
 root.position.lerp(target,1-Math.exp(-16*dt));root.rotation.x=THREE.MathUtils.damp(root.rotation.x,pitch,18,dt);root.rotation.y=THREE.MathUtils.damp(root.rotation.y,0,12,dt);root.rotation.z=THREE.MathUtils.damp(toward(root.rotation.z,rollGoal),rollGoal,12,dt);
 const live=kick&&!raw&&d.index!==5?kick:null;for(const key of ['x','y','z','pitch','yaw','roll'])applied[key]=live?live[key]:0;
 root.position.x+=applied.x;root.position.y+=applied.y;root.position.z+=applied.z;root.rotation.x+=applied.pitch;root.rotation.y+=applied.yaw;root.rotation.z+=applied.roll;
 for(const arm of d.fpArms)if(arm){arm.joints.forEach((j,i)=>j.quaternion.copy(arm.rest[i]));if(arm.leftAnchorRest)arm.leftAnchor.position.copy(arm.leftAnchorRest);if(arm.leftHand&&arm.leftRest){arm.leftHand.quaternion.copy(arm.leftRest);if(arm.handPosRest)arm.leftHand.position.copy(arm.handPosRest);}}
 if(d.gunRest){d.gun.position.copy(d.gunRest.position);d.gun.quaternion.copy(d.gunRest.quaternion);d.gun.scale.copy(d.gunRest.scale);}
 const rq=root.getWorldQuaternion(rigQ[1]);
 if(d.index===5){
  root.updateMatrixWorld(true);if(d.knifeGrip)d.knife.position.copy(root.worldToLocal(d.knifeGrip.getWorldPosition(v[0])));
  // Inspection toss: the blade turns end over end about its own axis and rises a little.
  // Inspection toss: the blade turns end over end about its own middle (not about the
  // grip, which swept the blade through the fingers) and rises clear of the hand.
  const spin=(ip?.bolt||0)*(raw?1:0),toss=Math.sin(Math.PI*Math.min(1,spin));d.knife.rotation.set(.52+spin*Math.PI*2,0,0);d.knife.position.y+=toss*.13;d.knife.position.z-=toss*.1;
  if(spin>0){const c=v[3].set(0,0,-.05),atRest=v[4].copy(c).applyAxisAngle(v[5].set(1,0,0),.52),now=c.applyAxisAngle(v[5],d.knife.rotation.x);d.knife.position.add(atRest.sub(now).multiplyScalar(toss));}
  // The free hand is lowered out of the way.
  if(d.leftHand){root.updateMatrixWorld(true);placeHand(d.fpArms[0],d.leftHand.getWorldPosition(v[0]).add(v[1].set(-.14,-.10,.02).applyQuaternion(rq)),null,v[2].set(-.35,-.7,.02).applyQuaternion(rq));}
 }
 if(d.index===4){root.updateMatrixWorld(true);const wrist=d.leftHand?.getWorldPosition(v[0]);if(wrist&&d.leftAnchor){const current=d.joints[1].getWorldPosition(v[1]),shift=v[2].copy(wrist).add(v[3].set(-.21,-.30,.13)).sub(current),anchor=d.leftAnchor.getWorldPosition(v[4]).add(shift);d.leftAnchor.position.copy(d.leftAnchor.parent.worldToLocal(anchor));root.updateMatrixWorld(true);
  // The M24's authored arm only meets its hand after its first fit: measure the wrist there,
  // once, then solve with the real forearm so the hand stays on it in every pose.
  const L=d.fpArms[0];if(!L.fitted){solveHand(d,wrist,v[5].set(-.25,-.7,.04));L.fitted=true;L.joints[0].updateWorldMatrix(true,false);L.wristLocal=L.joints[0].worldToLocal(d.leftHand.getWorldPosition(v[6]));}else solveArm(L,wrist,v[5].set(-.25,-.7,.04));}}
 // Parts: the magazine and the bolt, slide or charging handle, in the weapon's frame.
 if(d.mag){d.mag.position.copy(d.magRest);d.mag.visible=true;
  if(ip?.mag>.001&&d.index!==4){const drop=ip.mag*ipw*(ip.drop||.07);d.mag.position.y-=drop;d.mag.position.z+=drop*.14;}}
 const pull=d.index===5?0:(ip?.bolt||0)*ipw*(d.index===4?0:1);
 if(d.bolt){d.bolt.position.copy(d.boltRest);const lock=d.index===0&&empty&&(!reloading||rt<.84)?1:0;
  d.bolt.position.z+=recoil*.8+(d.index===4?cycle*.06:0)+pull*(d.index===0?.026:.038)+lock*.024;
  if(d.boltRestQ)d.bolt.quaternion.copy(d.boltRestQ);}
 root.updateMatrixWorld(true);
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
export const operatorDebug={operatorRest,gearTemplates};
export function dressOperator(root,team,operator){
 const d=root.userData;if(!d.bones||!operatorRest.frames)return;const key=operatorKey(team,operator);if(d.operatorKey===key)return;d.operatorKey=key;
 const old=[];root.traverse(o=>{if(o.userData.operatorGear)old.push(o);});for(const o of old)o.removeFromParent();
 for(const {bone,group,local} of gearTemplate(team,operator)){const target=d.bones.get(bone);if(!target)continue;const clone=group.clone();clone.traverse(o=>{if(o.isMesh)o.userData.ownedGeometry=false;});local.decompose(clone.position,clone.quaternion,clone.scale);target.add(clone);}
 // The export's cap and headset skins serve the reconnaissance kit; they ride the shared skeleton.
 // The export's cap skin serves the reconnaissance kit (its headset is authored adrift of the cap and stays hidden).
 const recon=/:ricognizione:/.test(key);root.traverse(o=>{if(o.isSkinnedMesh&&/GreenCap/.test(o.material.name))o.visible=recon;});
}
export function createAgent(team,weapon=3){
 const a=loaded.get('soldier_tac');if(!a)return null;
 const targetModel=tune(cloneSkeleton(a.scene),teamLooks[team]??=new Map()),tinted=tintedLooks;
 targetModel.traverse(o=>{
  if(!o.isMesh)return;const m=o.material;m.userData.teamLook=true;if(/HeadphonesT|GreenCap/.test(m.name)){o.visible=false;if(/GreenCap/.test(m.name)&&!tinted.has(m)){m.color.set(team==='blue'?0x55707c:0x9a7f5c);tinted.add(m);}}
  const armor=/Plate|Puches/.test(m.name),fabric=m.name==='Mil_Suit_R5';
  if((armor||fabric)&&!tinted.has(m)){
   // Retain photographed weave and folds while replacing the original green
   // garment dye. Skin, gloves, visor and neutral pads keep their own materials.
   const tint=new THREE.Color(team==='blue'?(armor?0x597c91:0x668a9e):(armor?0xa08560:0xaf9575));
   m.color.set(0xffffff);m.onBeforeCompile=shader=>{
    shader.uniforms.teamFabricTint={value:tint};shader.fragmentShader='uniform vec3 teamFabricTint;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat fabricValue=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)),0.0,1.0);\ndiffuseColor.rgb=teamFabricTint*(.48+.85*sqrt(fabricValue));');
   };m.customProgramCacheKey=()=>'operator-fabric-v18';tinted.add(m);
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
 left.restQ=gripOrientation(bones,'Left');right.restQ=gripOrientation(bones,'Right');
 const feet=[bones.get('LeftFoot'),bones.get('RightFoot')].filter(Boolean),legs=['Left','Right'].map(side=>({side,joints:[bones.get(side+'Leg'),bones.get(side+'UpLeg')],leftHand:bones.get(side+'Foot'),rest:bones.get(side+'Foot').getWorldQuaternion(new THREE.Quaternion())})),sole=Math.min(...feet.map(f=>f.getWorldPosition(new THREE.Vector3()).y));
 const shadow=contactShadow();root.add(shadow);
 root.userData={target,dst,rig,bones,weights:locomotionWeights(0),left,right,feet,legs,gaitPhase:0,sole,shadow,baseY:target.position.y,groundShift:0,bodyOffset:0,recoil:0,impact:0,
  poseRootQ:new THREE.Quaternion(),poseSourceQ:new THREE.Quaternion(),poseParentQ:new THREE.Quaternion(),lowerQ:new THREE.Quaternion(),upperQ:new THREE.Quaternion(),headQ:new THREE.Quaternion(),spineQ:new THREE.Quaternion(),spine1Q:new THREE.Quaternion(),gunQ:new THREE.Quaternion(),tempQ:new THREE.Quaternion(),tempV:new THREE.Vector3(),
  weaponModels:new Map(),weapon:-1,gun:null,wrist:bones.get('RightHand'),wasReload:false,reloadStart:0};
 captureOperatorRest(root,bones);dressOperator(root,team,DEFAULT_OPERATOR);attachWeapon(root,weapon);cullOperator(root);return root;
}
// The pose frame of each bone, chosen by name once instead of by regex every frame.
const poseFrame=key=>/Hips|Leg|Foot|Toe/.test(key)?'lowerQ':key==='Spine'?'spineQ':key==='Spine1'?'spine1Q':/Head|Neck/.test(key)?'headQ':/Arm|Hand|Shoulder|Thumb|Index|Middle|Ring|Pinky/.test(key)?'upperQ':'poseRootQ';
export function prepareAgentEquipment(root){const d=root.userData;if(!d.weaponModels)return;const selected=d.weapon;for(let i=0;i<6;i++)attachWeapon(root,i);attachWeapon(root,selected);}
// V34: an operator's held weapon is drawn in as few calls as its materials allow (the
// P226 export splits its frame into 12 meshes and its slide into 3, the knife has 8
// rings) and is frustum culled like any rigid mesh. Drops and the armory keep the
// plain display model.
function agentWeapon(index){
 const gun=createDisplayWeapon(index);if(!gun)return gun;
 const parents=[];gun.traverse(o=>{if(o.children.length>1)parents.push(o);});for(const o of parents)batchParts(o);
 gun.traverse(o=>{if(o.isMesh)o.frustumCulled=true;});return gun;
}
function attachWeapon(root,index){
 const d=root.userData;if(d.weapon===index||!d.wrist)return;d.gun?.removeFromParent();if(!d.weaponModels.has(index))d.weaponModels.set(index,agentWeapon(index));d.gun=d.weaponModels.get(index);if(!d.gun)return;d.wrist.add(d.gun);
 if(!d.gun.userData.flash){const socket=d.gun.getObjectByName('MuzzleSocket');if(socket){const f=new THREE.Mesh(new THREE.ConeGeometry(.045,.16,6),new THREE.MeshBasicMaterial({color:0xffdfab,transparent:true,opacity:.85,depthWrite:false}));f.rotation.x=-Math.PI/2;f.position.z=-.055;f.visible=false;socket.add(f);d.gun.userData.flash=f;}}
 const mag=d.gun.userData.magazine??=d.gun.getObjectByName('Magazine')||null;if(mag&&!d.gun.userData.magRest)d.gun.userData.magRest=mag.position.clone();d.weapon=index;
}
function orientGrip(arm,orientation){if(!arm.restQ)return;arm.leftHand.quaternion.copy(freshQuaternion(arm.leftHand.parent,ikQ[4]).invert().multiply(orientation).multiply(arm.restQ));arm.leftHand.updateWorldMatrix(false,false);}
const poseV=Array.from({length:6},()=>new THREE.Vector3());
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
 const pitch=THREE.MathUtils.clamp(pose.pitch||0,-1.15,1.15),upperPitch=pitch*.45-reloadWeight*.32+d.recoil*.025-d.impact*.055;
 d.plants??={};const oldX=d.plants.x??root.position.x,oldZ=d.plants.z??root.position.z;d.gaitPhase+=Math.hypot(root.position.x-oldX,root.position.z-oldZ)*Math.PI/.8;
 const duck=THREE.MathUtils.clamp(pose.duck||0,0,1);
 // V34: the skeleton is posed top down with fresh world matrices (see `rig`), and only
 // what the solve reads afterwards is kept current: the renderer's scene update
 // recomputes every node before drawing, so equipment, skins and fingers wait for it.
 // Same joint rotations as walking each read up to the root, at a fraction of the cost.
 d.target.position.y=d.baseY-duck*.48-(.125+(.5-.5*Math.cos(d.gaitPhase*2))*.012)*Math.min(1,speed/3);root.updateWorldMatrix(true,false);const rootQ=freshQuaternion(root,d.poseRootQ),axisX=d.tempV.set(1,0,0);
 d.upperQ.copy(rootQ).multiply(d.tempQ.setFromAxisAngle(axisX,upperPitch));d.headQ.copy(rootQ).multiply(d.tempQ.setFromAxisAngle(axisX,pitch*.85));
 d.spineQ.copy(rootQ).multiply(d.tempQ.setFromAxisAngle(axisX,upperPitch*.3));d.spine1Q.copy(rootQ).multiply(d.tempQ.setFromAxisAngle(axisX,upperPitch*.65));
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
 d.gunQ.copy(rootQ).multiply(d.tempQ.setFromAxisAngle(d.tempV.set(1,0,0),pitch-reloadWeight*.42+d.recoil*.035));
 const trigger=poseV[1].set(.16-reloadWeight*.035-(weapon===5?d.recoil*.12:0),-.025-reloadWeight*.12,(weapon===4?-.05:weapon===0?-.15:-.08)+reloadWeight*.04-(weapon===5?d.recoil*.12:0)).applyQuaternion(d.upperQ).add(poseV[2].set(0,1.44-duck*.48,0).applyQuaternion(rootQ)).add(root.position);
 solveHand(d.right,trigger,poseV[0].set(.45,-.7,.2).applyQuaternion(rootQ),true);orientGrip(d.right,d.gunQ);
 d.shadow.material.opacity=.20*Math.max(0,1-Math.max(0,root.position.y-(pose.groundY||0))*2);d.shadow.position.y=(pose.groundY||0)-root.position.y+.014;d.shadow.scale.set(1+speed*.025,1+speed*.025,1);
 attachWeapon(root,weapon);
 if(d.gun){
  const inverse=freshQuaternion(d.wrist,d.poseParentQ).invert();d.gun.quaternion.copy(inverse).multiply(d.gunQ);
  const scale=freshScale(d.wrist,d.tempV),worldScale=d.gun.userData.worldScale||.5;d.gun.scale.set(worldScale/scale.x,worldScale/scale.y,worldScale/scale.z);
  const wrist=freshPosition(d.wrist,poseV[3]),offset=poseV[4].copy(d.gun.userData.trigger).multiplyScalar(worldScale).applyQuaternion(d.gunQ);
  const palm=poseV[5].set(-.025,-.055,-.035+d.recoil*.025).applyQuaternion(d.gunQ);
  d.gun.position.copy(d.wrist.worldToLocal(wrist.add(palm).sub(offset)));
  const mag=d.gun.userData.magazine;if(mag&&d.gun.userData.magRest){mag.position.copy(d.gun.userData.magRest);mag.position.y-=reloadWeight*.13;mag.visible=!reloading||progress<.3||progress>.58;}
  if(weapon!==5){
   d.gun.updateWorldMatrix(false,true);const grip=d.leftGripTarget??=new THREE.Vector3();
   if(d.gun.userData.support)grip.copy(d.gun.userData.support),d.gun.localToWorld(grip);
   else freshPosition(d.wrist,grip).add(poseV[0].set(-.05,-.025,-.01).applyQuaternion(d.gunQ));
   if(reloading&&mag){const reach=Math.sin(Math.PI*THREE.MathUtils.clamp((progress-.12)/.74,0,1)),magGrip=(d.magGripTarget??=new THREE.Vector3());freshPosition(mag,magGrip);magGrip.add(poseV[1].set(-.025,-.015,0).applyQuaternion(d.gunQ));grip.lerp(magGrip,reach);}
   solveHand(d.left,grip,poseV[2].set(-.2,-.5,.05).applyQuaternion(rootQ),true);orientGrip(d.left,d.gunQ);
  }
 }
 if(weapon===5){const standby=poseV[3].set(-.24,1.17-duck*.48,-.16).applyQuaternion(rootQ).add(root.position);solveHand(d.left,standby,poseV[4].set(-.3,-.7,.05).applyQuaternion(rootQ),true);}
 if(d.gun?.userData.flash)d.gun.userData.flash.visible=performance.now()<(d.flashUntil||0);
 return true;
}
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
