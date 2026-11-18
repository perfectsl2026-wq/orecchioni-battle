import {applyFinish} from './weapon-finish.js?v=42.0';
import * as THREE from './vendor/three.module.js';
import {createAgent,createDisplayWeapon,animateAgent,relaxAgent,disposeAgent,dressOperator} from './assets.js?v=42.0';
import {blocked,groundHeight} from './shared.js?v=42.0';
const up=new THREE.Vector3(0,1,0),box=new THREE.Box3(),partBox=new THREE.Box3(),sample=new THREE.Vector3();
function visibleBounds(root){
 root.updateMatrixWorld(true);box.makeEmpty();root.traverse(o=>{
  if(!o.isMesh)return;for(let n=o;n;n=n.parent)if(!n.visible)return;
  // V42 bA: a dense skin (the CORAZZA body, ~17k vertices a part) is skinned on the CPU for its box: every 6th vertex is enough to rest it on the floor.
  if(o.isSkinnedMesh&&o.geometry.attributes.position.count>8000){const P=o.geometry.attributes.position;o.boundingBox??=new THREE.Box3();o.boundingBox.makeEmpty();for(let i=0;i<P.count;i+=6)o.boundingBox.expandByPoint(o.getVertexPosition(i,sample));}
  else if(o.isSkinnedMesh)o.computeBoundingBox();else if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
  const bounds=o.isSkinnedMesh?o.boundingBox:o.geometry.boundingBox;if(bounds)box.union(partBox.copy(bounds).applyMatrix4(o.matrixWorld));
 });return box;
}
// V53: bone work in the body's own frame (x right, y up, z back), whatever the parents are doing at the time.
const X=new THREE.Vector3(1,0,0),Z=new THREE.Vector3(0,0,1),tq=[new THREE.Quaternion(),new THREE.Quaternion(),new THREE.Quaternion()],tv=new THREE.Vector3(),ease=t=>t*t*(3-2*t);
function turn(body,bone,axis,angle){
 if(!bone||!angle)return;const parent=bone.parent.getWorldQuaternion(tq[0]).premultiply(tq[1].copy(body.quaternion).invert());
 bone.quaternion.premultiply(tq[1].copy(parent).invert().multiply(tq[2].setFromAxisAngle(axis,angle)).multiply(parent));
}
// The lowest point of the trunk and head (what the body lies on: back plate, pack, chest rig, helmet), limbs left out.
const LIMB=/Arm|Hand|Leg|Foot|Toe|Elbow|Knee/;
function trunkLow(root){
 root.updateMatrixWorld(true);let low=Infinity;root.traverse(o=>{
  if(!o.isMesh)return;for(let n=o;n;n=n.parent)if(!n.visible)return;
  if(o.isSkinnedMesh){const P=o.geometry.attributes.position,I=o.geometry.attributes.skinIndex,bones=o.skeleton.bones,limb=o.userData.limbBone??=bones.map(b=>LIMB.test(b.name)),step=P.count>8000?6:3;
   for(let i=0;i<P.count;i+=step){if(limb[I.getX(i)])continue;const y=o.getVertexPosition(i,sample).applyMatrix4(o.matrixWorld).y;if(y<low)low=y;}}
  else{for(let n=o.parent;n&&n!==root;n=n.parent)if(n.isBone&&LIMB.test(n.name))return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const y=partBox.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).min.y;if(y<low)low=y;}
 });return low;
}
// Lay a limb down: turn it at its root joint until its lowest joint rests `rest` metres above the ground the trunk lies on.
const lv=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
function layDown(body,rootBone,points,ground,down){
 if(!rootBone)return;rootBone.getWorldPosition(lv[0]);let drop=Infinity,reach=1;
 for(const [bone,rest]of points){if(!bone)continue;bone.getWorldPosition(lv[1]);const d=lv[1].y-ground-rest;if(d<drop){drop=d;lv[2].subVectors(lv[1],lv[0]);reach=lv[2].length();}}
 if(!Number.isFinite(drop)||reach<.05||Math.abs(drop)<.004)return;
 const limb=lv[2].applyQuaternion(tq[0].copy(body.quaternion).invert()).normalize(),axis=lv[3].crossVectors(limb,down);if(axis.lengthSq()<1e-4)return;
 turn(body,rootBone,axis.normalize(),Math.asin(Math.max(-.7,Math.min(.7,drop/reach))));rootBone.updateMatrixWorld(true);
}
// How a body comes to rest, on top of the relaxed standing pose (angles in radians; `side` 1 = thrown to its right).
// On the back: one knee up and fallen outward, the other leg rolled out, one arm thrown up beside the head, the other
// a little off the body. On the front: one leg drawn up to the side, one arm up past the head. The head rolls aside.
function sprawl(body,B,faceUp,side,vary){
 const a=side>0?'Right':'Left',b=side>0?'Left':'Right',t=(name,axis,angle)=>turn(body,B.get(name),axis,angle),Y=up;
 t('Spine1',Y,.1*side);t('Spine2',Y,.1*side);t('Neck',Y,-.3*side*vary);t('Head',Y,(faceUp?-.4:-.75)*side);
 if(faceUp){
  t(a+'UpLeg',X,.5*vary);t(a+'UpLeg',Z,side*.3);t(a+'Leg',X,-1.05*vary);
  t(b+'UpLeg',Z,-side*.16);t(b+'UpLeg',Y,side*.5);
  t(a+'Arm',Z,side*1.2*vary);t(a+'ForeArm',Z,side*.75);
  t(b+'Arm',Z,-side*.42);t(b+'ForeArm',Z,-side*.3);
 }else{
  t(a+'UpLeg',Y,-side*1.2);t(a+'UpLeg',Z,side*.7*vary);t(a+'Leg',Z,-side*1.15);
  t(b+'UpLeg',Z,-side*.12);t(b+'UpLeg',Y,side*.35);
  t(a+'Arm',Z,side*1.9*vary);t(a+'ForeArm',Z,side*.9);
  t(b+'Arm',Z,-side*.5);t(b+'ForeArm',Z,-side*.25);
 }
 body.updateMatrixWorld(true);
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
  for(let i=0;i<6;i++){if(!this.weaponPool.has(i))this.weaponPool.set(i,[]);while(this.weaponPool.get(i).length<1){const w=createDisplayWeapon(i,true);if(!w)break;this.weaponPool.get(i).push(w);made.push(w);}}return made;}
 recycle(object){object.removeFromParent();object.visible=true;object.traverse(o=>{o.matrixAutoUpdate=true;});}
 add(v,event,source){
  const key=v.id+':'+v.life;if(this.seen.has(key))return;this.seen.add(key);
  const body=this.pool[v.team]?.pop()||createAgent(v.team,event.weaponDropped??v.weapon);if(!body)return;body.visible=true;dressOperator(body,v.team,v.operator);
  // V53: a recycled body still had the last corpse's lying turn (only its yaw was set): it now starts upright every time.
  body.position.set(v.x,v.y||0,v.z);body.rotation.set(0,v.yaw,0);this.scene.add(body);
  animateAgent(body,1/60,false,v.weapon,0,{life:v.life,time:event.time,pitch:v.pitch||0,duck:v.duck||0});
  const d=body.userData;
  if(source?.userData.bones){for(const [name,b]of d.bones){const old=source.userData.bones.get(name);if(old)b.quaternion.copy(old.quaternion);}body.updateMatrixWorld(true);}
  d.shadow.visible=false;if(d.gun)d.gun.visible=false;
  const poses=[],original=new Map([...d.bones].map(([name,bone])=>[name,bone.quaternion.clone()]));
  // V42: the knees give first. A crouched, arms-down pose is the middle key, so the body folds
  // at the legs and only then tips over, instead of falling stiff from the boots like a plank.
  d.bodyOffset=0;d.gaitPhase=0;
  for(let n=0;n<24;n++)animateAgent(body,1/60,false,v.weapon,0,{life:v.life,time:event.time,pitch:0,duck:1,vx:0,vz:0});
  relaxAgent(body);const crouch=new Map([...d.bones].map(([name,bone])=>[name,bone.quaternion.clone()]));
  for(let n=0;n<24;n++)animateAgent(body,1/60,false,v.weapon,0,{life:v.life,time:event.time,pitch:0,duck:v.duck||0,vx:0,vz:0});
  relaxAgent(body);
  // V53: the body ends sprawled (a knee up, an arm thrown out, the head rolled aside), not laid out like a plank.
  const forward=new THREE.Vector3(-Math.sin(v.yaw),0,-Math.cos(v.yaw)),dir=fallDirection(v,event.direction),faceUp=dir.dot(forward)<=0;
  // The shot in the body's own frame (x right, y up, z back): which way the hit turns the body and whips the head.
  const shot=new THREE.Vector3(event.direction?.[0]||dir.x,0,event.direction?.[2]||dir.z).normalize().applyQuaternion(tq[0].copy(body.quaternion).invert());
  let seed=0;for(const c of key)seed=(seed*31+c.charCodeAt(0))>>>0;const lateral=dir.x*Math.cos(v.yaw)-dir.z*Math.sin(v.yaw),side=Math.abs(lateral)>.2?Math.sign(lateral):seed&1?1:-1,vary=.75+(seed>>3&7)/14;
  sprawl(body,d.bones,faceUp,side,vary);
  for(const [name,bone]of d.bones)poses.push({bone,from:original.get(name),mid:crouch.get(name),to:bone.quaternion.clone(),group:/Leg|Foot|Toe/.test(name)?1:/Shoulder|Arm|Hand/.test(name)?2:0});
  // Blend from the actual moving pose into relaxed limbs, then settle the body.
  const standing=body.quaternion.clone();
  // Settle on the chest or back. Preserving the standing roll would leave a
  // diagonal fall balanced on one boot or forearm, with the torso suspended.
  // V53: the body turns a little about the vertical as it goes down (toward the side it was hit on), so it never lies ruled
  // along the shot line; `head` is where the head ends up.
  const twist=side*(.2+.22*vary)*(faceUp?1:-1),head=dir.clone().applyAxisAngle(up,twist),back=up.clone().multiplyScalar(faceUp?-1:1),right=new THREE.Vector3().crossVectors(head,back).normalize();
  const lying=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,head,back));
  // V53: lying on a pack or a chest rig the limbs used to hang in the air, straight out from the trunk. They are laid on
  // the ground the trunk rests on (twice: the second pass takes up what the first one moved), and that is the rest pose.
  for(const p of poses)p.bone.quaternion.copy(p.to);body.quaternion.copy(lying);body.position.y=0;
  {const B=d.bones,g=n=>B.get(n),down=new THREE.Vector3(0,0,faceUp?1:-1),base=trunkLow(body)+(faceUp?.05:.09);
   for(let pass=0;pass<2;pass++)for(const s of ['Left','Right']){
    layDown(body,g(s+'UpLeg'),[[g(s+'Foot'),faceUp?.1:.12],[g(s+'ToeBase'),.07],[g(s+'Leg'),.09]],base,down);
    layDown(body,g(s+'Arm'),[[g(s+'Hand'),.06],[g(s+'ForeArm'),.08]],base,down);}
   body.updateMatrixWorld(true);for(const p of poses)p.to.copy(p.bone.quaternion);}
  // Pouches and a pack give under the weight: the trunk settles a few centimetres into what it lies on (more on the chest rig).
  const ground=groundHeight(v.x,v.z),floor=Math.max(-visibleBounds(body).min.y+.025-(faceUp?.05:.09),.02)+ground;
  // V53: the fall turns about the hips, not the boots. The hips drop where the knees give and travel a short way along the
  // fall; the boots slide out the other way (never into a wall behind). `hip` is the joint in the body's frame.
  const hip=body.worldToLocal(d.bones.get('Hips').getWorldPosition(new THREE.Vector3()));body.quaternion.copy(standing);body.position.y=v.y||0;for(const p of poses)p.bone.quaternion.copy(p.from);
  let slide=.42;while(slide>.05&&blocked(v.x-dir.x*slide,v.z-dir.z*slide,.16))slide-=.1;slide=Math.max(0,slide);
  const reach=Math.max(.2,hip.y-slide),hipFrom=hip.clone().applyQuaternion(standing).add(body.position),hipTo=hip.clone().applyQuaternion(lying);hipTo.set(v.x+dir.x*reach,floor+hipTo.y,v.z+dir.z*reach);
  const rest=hipTo.clone().sub(hip.clone().applyQuaternion(lying));
  const contact=d.shadow.clone();contact.material=contact.material.clone();contact.visible=true;contact.position.set(hipTo.x-head.x*.08,.012,hipTo.z-head.z*.08);contact.position.y=groundHeight(contact.position.x,contact.position.z)+.012;contact.rotation.set(-Math.PI/2,0,Math.atan2(-head.z,head.x));contact.scale.set(2.7,1.25,1);contact.material.opacity=0;this.scene.add(contact);
  const weapon=this.weaponPool.get(v.weapon)?.pop()||createDisplayWeapon(v.weapon,true);let drop=null;if(weapon)weapon.visible=true;
  if(weapon){
   applyFinish(weapon,v.weapon,v.finish);
   // V53: the weapon leaves the hands to the side away from the turn and comes to rest beside the body, not under it.
   const start=new THREE.Vector3(v.x,1.15+(v.y||0),v.z),away=v.weapon===4?.75:.55,end=start.clone().addScaledVector(dir,.35).addScaledVector(right,-side*(faceUp?1:-1)*away);end.y=.11;
   if(blocked(end.x,end.z,.18)){end.copy(start).addScaledVector(dir,.7);if(blocked(end.x,end.z,.18)){end.x=v.x;end.z=v.z;}}
   const yaw=Math.atan2(-dir.x,-dir.z)-.5;weapon.position.set(end.x,0,end.z);weapon.rotation.set(.08,yaw+.5,Math.PI/2);end.y=-visibleBounds(weapon).min.y+.012+groundHeight(end.x,end.z);
   weapon.position.copy(start);weapon.rotation.set(0,yaw,.1);this.scene.add(weapon);drop={mesh:weapon,start,end,yaw};
  }
  // Timing: a head shot drops at once, a body shot sags first. The hips land at `sit`, the shoulders at `fall`, then two
  // small rebounds; the limbs come to rest after the trunk and everything is still by about 1.1 s.
  const headshot=!!event.headshot,buckle=headshot?.1:.2,sit=headshot?.27:.36,fall=headshot?.5:.62;
  const B=d.bones,pick=n=>B.get(n)||null;
  // Where the boots stand as the shot lands (their middle, and the height of the lower ankle).
  body.updateMatrixWorld(true);const stood=new THREE.Vector3();{const a=pick('LeftFoot').getWorldPosition(new THREE.Vector3()),b=pick('RightFoot').getWorldPosition(new THREE.Vector3());stood.set((a.x+b.x)/2,Math.min(a.y,b.y),(a.z+b.z)/2);}
  body.userData.poolTeam=v.team;this.items.push({key,body,poses,standing,lying,floor,ground,rest,hipFrom,hipTo,drop,dropIndex:v.weapon,contact,time:event.time,buckle,sit,fall,dust:false,faceUp,side,headshot,
   feet:[pick('LeftFoot'),pick('RightFoot')],stood,grounded:stood.y-ground<.3,
   shotAxis:new THREE.Vector3().crossVectors(up,shot).normalize(),hips:pick('Hips'),spine:[pick('Spine'),pick('Spine1'),pick('Spine2')],neck:pick('Neck'),headBone:pick('Head'),arms:[pick('LeftArm'),pick('RightArm')],fore:[pick('LeftForeArm'),pick('RightForeArm')],
   low:['LeftFoot','RightFoot','LeftToeBase','RightToeBase','LeftLeg','RightLeg','Head'].map(pick).filter(Boolean)});
  while(this.items.length>8)this.remove(this.items.shift());
 }
 update(now){
  for(let n=this.items.length-1;n>=0;n--){const item=this.items[n],age=Math.max(0,(now-item.time)/1000);if(age>18){this.remove(item);this.items.splice(n,1);continue;}if(item.settled)continue;
   const body=item.body,f=item.faceUp?1:-1;
   // Knees: 0 → 1 over the buckle. Hips: they sag as the knees go, then drop like a weight and land at `sit` (one short
   // bounce). Tip: slow while the body folds, then the trunk goes over about the hips and the shoulders land at `fall`.
   const b=Math.min(1,age/item.buckle),knees=ease(b),start=item.buckle*.3,p=Math.min(1,Math.max(0,(age-start)/(item.fall-start))),tip=p**1.35,k=age-item.fall,u=Math.min(1,age/item.sit),s=age-item.sit;
   const rebound=k<=0?0:k<.13?.05*Math.sin(Math.PI*k/.13):k<.24?.016*Math.sin(Math.PI*(k-.13)/.11):0;
   // The trunk settles with the tip; the legs stay folded until the hips are down and then slide out; the arms hang in the
   // air behind the fall and drop a moment after the shoulders.
   const trunk=ease(p),legs=ease(Math.min(1,Math.max(0,(s+.1)/.46))),arms=ease(Math.min(1,Math.max(0,(age-item.fall+.1)/.34)));
   for(const q of item.poses){const w=q.group===1?legs:q.group===2?arms:trunk;q.bone.quaternion.slerpQuaternions(q.from,q.mid,knees);if(w>0)q.bone.quaternion.slerp(q.to,w);}
   body.quaternion.slerpQuaternions(item.standing,item.lying,tip*(1-rebound));
   // The hit itself: the chest is pushed along the shot and comes back (a head shot whips the head instead), in 0.25 s.
   const hit=age<.25?Math.sin(Math.PI*Math.min(1,age/.07)*.5)*(1-ease(Math.min(1,age/.25))):0;
   if(hit>0){if(item.headshot){turn(body,item.neck,item.shotAxis,.3*hit);turn(body,item.headBone,item.shotAxis,.55*hit);turn(body,item.spine[2],item.shotAxis,.12*hit);}
    else{turn(body,item.spine[1],item.shotAxis,.16*hit);turn(body,item.spine[2],item.shotAxis,.2*hit);turn(body,item.headBone,item.shotAxis,-.18*hit);}}
   // Weight: the trunk curls against the fall (the chest and the head trail the hips), is thrown flat when the shoulders
   // land (the head a moment later, with a nod), and the arms trail in the air until then.
   const air=Math.sin(Math.PI*Math.min(1,p**1.6*1.08))*(1-Math.min(1,Math.max(0,k/.08))),whip=k>0&&k<.3?Math.sin(Math.PI*k/.15)*Math.exp(-k/.07):0,curl=f*(-.12*air+.05*whip);
   if(curl){for(const bone of item.spine)turn(body,bone,X,curl);turn(body,item.neck,X,f*(-.26*air+.2*whip));turn(body,item.headBone,X,f*(-.2*air+.16*whip));}
   const lag=air*(1-arms);if(lag>0)for(let i=0;i<2;i++){const out=i?1:-1;turn(body,item.arms[i],X,f*.95*lag);turn(body,item.arms[i],Z,out*.45*lag);turn(body,item.fore[i],X,f*.5*lag);}
   // Feet first, then hips. While the legs fold the boots stay where they stood and carry the body (it sinks and leans
   // over them, it does not float down a curve); as the hips come down the legs let go and the hip joint takes over on
   // its own path: down like a weight, a short way along the fall, one small bounce.
   const drop=u*u,travel=1-(1-u)*(1-u),bounce=s>0&&s<.14?.035*Math.sin(Math.PI*s/.14):0,hy=item.hipFrom.y+(item.hipTo.y-item.hipFrom.y)*drop+bounce+rebound*.12;
   body.position.set(0,0,0);body.updateMatrixWorld(true);item.hips.getWorldPosition(tv);
   const fa=item.feet[0].matrixWorld.elements,fb=item.feet[1].matrixWorld.elements,free=ease(Math.min(1,Math.max(0,(s+.12)/.3))),hold=1-free;
   body.position.set(item.hipFrom.x+(item.hipTo.x-item.hipFrom.x)*travel-tv.x,hy-tv.y,item.hipFrom.z+(item.hipTo.z-item.hipFrom.z)*travel-tv.z);
   if(hold>0){body.position.x+=(item.stood.x-(fa[12]+fb[12])/2-body.position.x)*hold;body.position.z+=(item.stood.z-(fa[14]+fb[14])/2-body.position.z)*hold;
    if(item.grounded)body.position.y+=(item.stood.y-Math.min(fa[13],fb[13])-body.position.y)*hold;}
   // Nothing goes through the floor on the way down: the lowest joint carries the body until the pose has settled.
   let lowest=Infinity;for(const bone of item.low){const e=bone.matrixWorld.elements;lowest=Math.min(lowest,e[13]);}
   const lift=item.ground+.05-(lowest+body.position.y);if(lift>0)body.position.y+=lift*(1-ease(Math.min(1,Math.max(0,(k-.1)/.3))));
   item.contact.material.opacity=tip*.16;
   if(k>=0&&!item.dust){item.dust=true;this.onImpact?.(item);}
   // V53: the weapon is let go and falls (gravity, from the hands), it no longer glides level to its place.
   if(item.drop){const d=item.drop,t=Math.min(1,age/.55),hop=age<.55?0:age<.72?Math.sin(Math.PI*(age-.55)/.17)*.035:0,out=1-(1-t)*(1-t);
    d.mesh.position.lerpVectors(d.start,d.end,out);d.mesh.position.y=d.start.y+.12*t-(d.start.y-d.end.y+.12)*t*t+hop;d.mesh.rotation.set(t*.08,d.yaw+t*.5+(age>.55&&age<.72?.06*Math.sin(Math.PI*(age-.55)/.17):0),t*Math.PI*.5);}
   if(age>=item.fall+.5){item.settled=true;body.quaternion.copy(item.lying);body.position.copy(item.rest);for(const q of item.poses)q.bone.quaternion.copy(q.to);if(item.drop){item.drop.mesh.position.copy(item.drop.end);item.drop.mesh.rotation.set(.08,item.drop.yaw+.5,Math.PI*.5);}
    body.updateMatrixWorld(true);body.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});}
  }
 }
 remove(item){item.contact.removeFromParent();item.contact.material.dispose();
  const team=item.body.userData.poolTeam;if(team&&this.pool[team].length<3){this.recycle(item.body);this.pool[team].push(item.body);}else disposeAgent(item.body);
  if(item.drop){const list=this.weaponPool.get(item.dropIndex);if(list&&list.length<2){this.recycle(item.drop.mesh);list.push(item.drop.mesh);}else disposeAgent(item.drop.mesh);}}
 clear(){for(const item of this.items)this.remove(item);this.items=[];this.seen.clear();}
}
