import * as THREE from './vendor/three.module.js';
// V44 first-person arms. The rigs' forearms were long untapered tubes (9-10 cm across at the elbow end, the same at the
// wrist) and the gloves a size large, so a forearm ran in from the bottom corner like a pipe and a glove hid the pistol.
// Proportions are set on the bones, once per rig, before any rest pose is read: the twist chain is thinned towards the
// wrist (taper), the forearm shortened, the hand scaled about its palm (the palm stays on the grip), and the shoulder
// moved along so the forearm still ends at the wrist. Then the fingers are closed round what the hand holds.
// `elbow`, `mid`, `wrist`: cross-section of the three twist segments (cumulative down the chain); `length`: forearm length.
// V44 review: the first pass (elbow .9, length .86, hand .87) read the same as before on every rifle; the forearm is now
// thinned a sixth at the elbow end and a quarter more at the wrist, a fifth shorter, the glove a size smaller.
export const ARM_SHAPE={elbow:.84,mid:.92,wrist:.93,length:.8,hand:.84};
const V=()=>new THREE.Vector3();
export function palmOf(hand,side){
 const wrist=hand.getWorldPosition(V()),tips=['007','011','015','019'].map(n=>hand.getObjectByName(`Bone_${side}${n}_end`)).filter(Boolean).map(o=>o.getWorldPosition(V()));
 return tips.length?tips.reduce((a,b)=>a.add(b),V()).multiplyScalar(1/tips.length).lerp(wrist,.45):wrist;
}
export function shapeArms(model,S=ARM_SHAPE){
 model.updateMatrixWorld(true);
 for(const side of ['L','R']){
  const get=n=>model.getObjectByName(n),anchor=get('Arm_'+side),t3=get('BoneTwist_03'+side),t2=get('BoneTwist_02'+side),t1=get('BoneTwist_01'+side),end=get('BoneTwist_01'+side+'_end'),hand=get('Hand_'+side);
  if(!anchor||!t3||!t2||!t1||!end||!hand)continue;
  const wrist=hand.getWorldPosition(V()),palm=palmOf(hand,side),reach=end.getWorldPosition(V()).sub(wrist);
  // Glove: scaled about the palm, so the palm keeps its place on the grip and the wrist comes in with it.
  hand.scale.multiplyScalar(S.hand);const goal=palm.clone().lerp(wrist,S.hand);hand.position.copy(hand.parent.worldToLocal(goal.clone()));
  // Forearm: the twist segments' cross-section narrows toward the wrist (they turn about the bone's own axis, so the
  // scale does not shear) and the first segment's length scales the chain; the authored gap between the forearm's end
  // and the hand (the AVERLA rigs) is kept.
  t3.scale.set(S.elbow,S.length,S.elbow);t2.scale.set(S.mid,1,S.mid);t1.scale.set(S.wrist,1,S.wrist);model.updateMatrixWorld(true);
  const shift=goal.add(reach).sub(end.getWorldPosition(V()));anchor.position.copy(anchor.parent.worldToLocal(anchor.getWorldPosition(V()).add(shift)));model.updateMatrixWorld(true);
 }
}
// Closes a hand's fingers round a cylinder (world point, axis, radius): each joint, knuckle first, turns about a line
// parallel to the axis (the way a finger wraps a grip) until the next joint or the fingertip rests on the surface
// (`pad`: half a finger's thickness), never through it, and never opened back past `open` radians.
const CHAINS=[['005','006','007','007_end'],['009','010','011','011_end'],['013','014','015','015_end'],['017','018','019','019_end']],THUMB=['021','022','022_end'];
export function wrapFingers(model,side,point,axis,radius,{pad=.0065,open=.15,curl=1.7,thumb=false,fingers=[0,1,2,3]}={}){
 model.updateMatrixWorld(true);const a=axis.clone().normalize(),q=new THREE.Quaternion(),pq=new THREE.Quaternion(),c=V(),j=V(),t=V(),r=V(),n=V();
 const off=p=>{t.copy(p).sub(point);return t.sub(n.copy(a).multiplyScalar(t.dot(a))).length();};
 const chains=fingers.map(i=>CHAINS[i]).concat(thumb?[THUMB]:[]);
 for(const chain of chains){
  const bones=chain.map(n=>model.getObjectByName(`Bone_${side}${n}`));if(bones.some(b=>!b))continue;
  for(let k=0;k<bones.length-1;k++){
   const bone=bones[k];bone.getWorldPosition(j);bones[k+1].getWorldPosition(c);
   // Curl direction: the turn about the axis that brings the next point toward it.
   const toAxis=V().copy(point).addScaledVector(a,j.clone().sub(point).dot(a)).sub(j),sign=Math.sign(a.dot(V().crossVectors(c.clone().sub(j),toAxis)))||1;
   const target=radius+pad;let best=0,score=Infinity;
   for(let ang=-open;ang<=curl;ang+=.02){r.copy(c).sub(j).applyAxisAngle(a,ang*sign).add(j);const d=off(r),s=Math.abs(d-target)+(d<target*.92?4*(target*.92-d):0)+.002*Math.abs(ang);if(s<score){score=s;best=ang;}}
   bone.parent.getWorldQuaternion(pq);q.setFromAxisAngle(a,best*sign);bone.quaternion.premultiply(pq.clone().invert().multiply(q).multiply(pq));bone.updateMatrixWorld(true);
  }
 }
}
// The forearm follows the hand's roll. The rig's twist bones were never driven: a hand turned palm-up on a fore-end or
// round onto a pistol grip left the forearm's skin facing the old way, and the wrist wrung into a thin folded tube.
// `untwist` gives the three twist segments a third each of the roll that brings the hand back to the twist it had
// against the forearm in the bind pose. Rest turns are kept so every frame starts from them.
const tm=new THREE.Matrix4(),tq=new THREE.Quaternion(),tq2=new THREE.Quaternion(),tx=new THREE.Vector3(),ty=new THREE.Vector3(0,1,0),tp=new THREE.Vector3(),ts=new THREE.Vector3();
const rollOf=(q01,qh)=>{tx.set(1,0,0).applyQuaternion(tq2.copy(q01).invert().multiply(qh));return Math.atan2(tx.z,tx.x);};
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function twistRig(model,side){
 let skin=null;model.traverse(o=>{if(o.isSkinnedMesh&&!skin)skin=o;});const get=n=>model.getObjectByName(n),bones=['BoneTwist_03','BoneTwist_02','BoneTwist_01'].map(n=>get(n+side)),hand=get('Hand_'+side);
 if(!skin||bones.some(b=>!b)||!hand)return null;const sk=skin.skeleton,bind=b=>{const i=sk.bones.indexOf(b);if(i<0)return null;const q=new THREE.Quaternion();tm.copy(sk.boneInverses[i]).invert().decompose(tp,q,ts);return q;};
 const qb=bind(bones[2]),qh=bind(hand);if(!qb||!qh)return null;
 const t={bones,hand,rest:bones.map(b=>b.quaternion.clone()),bind:rollOf(qb,qh),sign:1};
 // Which way a turn of the segment moves the reading (the bone axes are the export's, not known in advance).
 model.updateMatrixWorld(true);const a0=rollOf(bones[2].getWorldQuaternion(tq),hand.getWorldQuaternion(new THREE.Quaternion()));
 bones[2].quaternion.multiply(tq.setFromAxisAngle(ty,.3));bones[2].updateMatrixWorld(true);const a1=rollOf(bones[2].getWorldQuaternion(tq),hand.getWorldQuaternion(new THREE.Quaternion()));
 bones[2].quaternion.copy(t.rest[2]);bones[2].updateMatrixWorld(true);t.sign=wrapAngle(a1-a0)<0?1:-1;return t;
}
const hq0=new THREE.Quaternion(),bq0=new THREE.Quaternion();
export function untwist(t,share=1){
 if(!t)return;t.bones.forEach((b,i)=>b.quaternion.copy(t.rest[i]));t.bones[0].updateMatrixWorld(true);t.hand.updateWorldMatrix(true,false);
 const c=wrapAngle(rollOf(t.bones[2].getWorldQuaternion(bq0),t.hand.getWorldQuaternion(hq0))-t.bind)*share*t.sign/3;if(Math.abs(c)<1e-4)return;
 tq.setFromAxisAngle(ty,c);for(const b of t.bones)b.quaternion.multiply(tq);t.bones[0].updateMatrixWorld(true);
}
// V44 review: the sleeve cuff (polsino). The rig's sleeve ran into the glove with no edge, so the forearm read as one
// tube from the corner of the screen to the fingers. A glove gauntlet now closes over the end of the sleeve: a short
// flared band round the wrist segment of the forearm (it turns with the forearm's twist), its radius taken from the
// skin itself where it sits, with a rolled rim at the sleeve end. One shared material, two small lathes per rig.
let cuffMaterial=null;
const cuffProfile=(r,len)=>[[r*.97,-.004],[r*1.03,0],[r*1.05,len*.35],[r*1.09,len*.8],[r*1.15,len*.92],[r*1.16,len],[r*1.1,len*1.06],[r*1.02,len*1.06]].map(([x,y])=>new THREE.Vector2(x,y));
export function addCuffs(model){
 let skin=null;model.traverse(o=>{if(o.isSkinnedMesh&&!skin)skin=o;});if(!skin)return;model.updateMatrixWorld(true);
 cuffMaterial??=new THREE.MeshStandardMaterial({color:0x353a31,roughness:.9,metalness:0,envMapIntensity:.35,name:'arms-cuff'});
 const sk=skin.skeleton,si=skin.geometry.attributes.skinIndex,sw=skin.geometry.attributes.skinWeight,n=si.count,v=V(),pa=V(),pb=V();
 for(const side of ['L','R']){
  const t1=model.getObjectByName('BoneTwist_01'+side),end=model.getObjectByName('BoneTwist_01'+side+'_end'),hand=model.getObjectByName('Hand_'+side),bi=sk.bones.indexOf(t1);if(!t1||!end||!hand||bi<0)continue;
  // The segment's axis in world: from the twist bone to the wrist; radii of the skin bound to it, 55-90 % of the way.
  t1.getWorldPosition(pa);end.getWorldPosition(pb);const ax=pb.clone().sub(pa),len=ax.length();ax.normalize();const rs=[];
  for(let i=0;i<n;i++){let w=0;for(let k=0;k<4;k++)if(si.getComponent(i,k)===bi)w+=sw.getComponent(i,k);if(w<.6)continue;skin.getVertexPosition(i,v);v.applyMatrix4(skin.matrixWorld).sub(pa);const t=v.dot(ax)/len;if(t<.55||t>.9)continue;rs.push(v.addScaledVector(ax,-t*len).length());}
  if(rs.length<8)continue;rs.sort((a,b)=>a-b);const r=rs[Math.floor(rs.length*.9)];
  // Built in world size along +y, then put on the bone: the bone's own scale is (s,1,s) about its length (the taper), so
  // the band keeps a round section; it starts 6 mm short of the wrist and runs a third of the way up the forearm.
  const g=new THREE.LatheGeometry(cuffProfile(r,len*.42),20);g.rotateX(Math.PI);g.translate(0,len*.97,0);
  const cuff=new THREE.Mesh(g,cuffMaterial);cuff.name='Cuff_'+side;cuff.userData.ownedGeometry=true;cuff.castShadow=false;cuff.frustumCulled=false;
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),ax);cuff.quaternion.copy(q);cuff.position.copy(pa);cuff.updateMatrixWorld(true);
  t1.attach(cuff);
 }
}
