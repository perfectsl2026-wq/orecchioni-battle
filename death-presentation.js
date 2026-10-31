import {applyFinish} from './weapon-finish.js?v=38.1';
import * as THREE from './vendor/three.module.js';
import {createAgent,createDisplayWeapon,animateAgent,relaxAgent,disposeAgent,dressOperator} from './assets.js?v=38.1';
import {blocked,groundHeight} from './shared.js?v=38.1';
const up=new THREE.Vector3(0,1,0),box=new THREE.Box3(),partBox=new THREE.Box3();
function visibleBounds(root){
 root.updateMatrixWorld(true);box.makeEmpty();root.traverse(o=>{
  if(!o.isMesh)return;for(let n=o;n;n=n.parent)if(!n.visible)return;
  if(o.isSkinnedMesh)o.computeBoundingBox();else if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
  const bounds=o.isSkinnedMesh?o.boundingBox:o.geometry.boundingBox;if(bounds)box.union(partBox.copy(bounds).applyMatrix4(o.matrixWorld));
 });return box;
}
export function fallDirection(v,direction){
 const base=Math.atan2(direction?.[0]||Math.sin(v.yaw),direction?.[2]||Math.cos(v.yaw));
 for(const a of [base,base+.8,base-.8,base+Math.PI/2,base-Math.PI/2,base+2.35,base-2.35,base+Math.PI]){
  const x=Math.sin(a),z=Math.cos(a);let clear=true;
  for(let n=1;n<=8;n++)if(blocked(v.x+x*n*.23,v.z+z*n*.23,.3)||Math.abs(groundHeight(v.x+x*n*.23,v.z+z*n*.23)-groundHeight(v.x,v.z))>.3){clear=false;break;}
  if(clear)return new THREE.Vector3(x,0,z);
 }
 return new THREE.Vector3(Math.sin(base),0,Math.cos(base));
}
export class DeathPresentation{
 constructor(scene){this.scene=scene;this.items=[];this.seen=new Set();this.pool={blue:[],orange:[]};this.weaponPool=new Map();}
 // V33: bodies and dropped weapons are prepared before the match (a fresh rig clone and its
 // shader programs cost ~27 ms at the first kill) and recycled when a death fades.
 warm(perTeam=2){const made=[];for(const team of ['blue','orange'])while(this.pool[team].length<perTeam){const body=createAgent(team,3);if(!body)break;this.pool[team].push(body);made.push(body);}
  for(let i=0;i<6;i++){if(!this.weaponPool.has(i))this.weaponPool.set(i,[]);while(this.weaponPool.get(i).length<1){const w=createDisplayWeapon(i);if(!w)break;this.weaponPool.get(i).push(w);made.push(w);}}return made;}
 recycle(object){object.removeFromParent();object.visible=true;object.traverse(o=>{o.matrixAutoUpdate=true;});}
 add(v,event,source){
  const key=v.id+':'+v.life;if(this.seen.has(key))return;this.seen.add(key);
  const body=this.pool[v.team]?.pop()||createAgent(v.team,event.weaponDropped??v.weapon);if(!body)return;body.visible=true;dressOperator(body,v.team,v.operator);
  body.position.set(v.x,v.y||0,v.z);body.rotation.y=v.yaw;this.scene.add(body);
  animateAgent(body,1/60,false,v.weapon,0,{life:v.life,time:event.time,pitch:v.pitch||0,duck:v.duck||0});
  const d=body.userData;
  if(source?.userData.bones){for(const [name,b]of d.bones){const old=source.userData.bones.get(name);if(old)b.quaternion.copy(old.quaternion);}body.updateMatrixWorld(true);}
  d.shadow.visible=false;if(d.gun)d.gun.visible=false;
  const poses=[],original=new Map([...d.bones].map(([name,bone])=>[name,bone.quaternion.clone()]));
  d.bodyOffset=0;d.gaitPhase=0;
  animateAgent(body,1/60,false,v.weapon,0,{life:v.life,time:event.time,pitch:0,duck:v.duck||0,vx:0,vz:0});
  relaxAgent(body);
  for(const [name,bone]of d.bones)poses.push({bone,from:original.get(name),to:bone.quaternion.clone()});
  // Blend from the actual moving pose into relaxed limbs, then settle the body.
  const dir=fallDirection(v,event.direction),standing=body.quaternion.clone();
  // Settle on the chest or back. Preserving the standing roll would leave a
  // diagonal fall balanced on one boot or forearm, with the torso suspended.
  const forward=new THREE.Vector3(-Math.sin(v.yaw),0,-Math.cos(v.yaw)),back=up.clone().multiplyScalar(dir.dot(forward)>0?1:-1),right=new THREE.Vector3().crossVectors(dir,back).normalize();
  const lying=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,dir,back));
  for(const p of poses)p.bone.quaternion.copy(p.to);body.quaternion.copy(lying);body.position.y=0;
  const floor=-visibleBounds(body).min.y+.025+groundHeight(v.x,v.z);body.quaternion.copy(standing);for(const p of poses)p.bone.quaternion.copy(p.from);
  const contact=d.shadow.clone();contact.material=contact.material.clone();contact.visible=true;contact.position.set(v.x+dir.x*.8,.012,v.z+dir.z*.8);contact.position.y=groundHeight(contact.position.x,contact.position.z)+.012;contact.rotation.set(-Math.PI/2,0,Math.atan2(-dir.z,dir.x));contact.scale.set(2.7,1.25,1);contact.material.opacity=0;this.scene.add(contact);
  const weapon=this.weaponPool.get(v.weapon)?.pop()||createDisplayWeapon(v.weapon);let drop=null;if(weapon)weapon.visible=true;
  if(weapon){
   applyFinish(weapon,v.weapon,v.finish);
   const start=new THREE.Vector3(v.x,1.15+(v.y||0),v.z),end=start.clone().addScaledVector(dir,.7);end.y=.11;
   if(blocked(end.x,end.z,.18)){end.x=v.x;end.z=v.z;}
   const yaw=Math.atan2(-dir.x,-dir.z)-.5;weapon.position.set(end.x,0,end.z);weapon.rotation.set(.08,yaw+.5,Math.PI/2);end.y=-visibleBounds(weapon).min.y+.012+groundHeight(end.x,end.z);
   weapon.position.copy(start);weapon.rotation.set(0,yaw,.1);this.scene.add(weapon);drop={mesh:weapon,start,end,yaw};
  }
  body.userData.poolTeam=v.team;this.items.push({key,body,poses,standing,lying,floor,drop,dropIndex:v.weapon,contact,time:event.time,initialY:v.y||0});
  while(this.items.length>8)this.remove(this.items.shift());
 }
 update(now){
  for(let n=this.items.length-1;n>=0;n--){const item=this.items[n],age=Math.max(0,(now-item.time)/1000);if(age>18){this.remove(item);this.items.splice(n,1);continue;}if(item.settled)continue;const u=Math.min(1,age/.72),ease=u*u*(3-2*u);
   for(const p of item.poses)p.bone.quaternion.slerpQuaternions(p.from,p.to,ease);
   item.body.quaternion.slerpQuaternions(item.standing,item.lying,ease);item.body.position.y=item.floor*Math.sin(ease*Math.PI/2)+item.initialY*(1-ease);
   item.contact.material.opacity=ease*.16;
   if(item.drop){const d=item.drop,t=Math.min(1,age/.6);d.mesh.position.lerpVectors(d.start,d.end,t);d.mesh.position.y+=Math.sin(t*Math.PI)*.23;d.mesh.rotation.set(t*.08,d.yaw+t*.5,t*Math.PI*.5);}
   if(u===1){item.settled=true;item.body.updateMatrixWorld(true);item.body.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});}
  }
 }
 remove(item){item.contact.removeFromParent();item.contact.material.dispose();
  const team=item.body.userData.poolTeam;if(team&&this.pool[team].length<3){this.recycle(item.body);this.pool[team].push(item.body);}else disposeAgent(item.body);
  if(item.drop){const list=this.weaponPool.get(item.dropIndex);if(list&&list.length<2){this.recycle(item.drop.mesh);list.push(item.drop.mesh);}else disposeAgent(item.drop.mesh);}}
 clear(){for(const item of this.items)this.remove(item);this.items=[];this.seen.clear();}
}
