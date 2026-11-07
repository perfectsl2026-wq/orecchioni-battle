import * as T from './vendor/three.module.js';
// V43 b34: what an operator carries in third person beside the held weapon.
// 1) The CAMPO sling of the mitra and the two rifles (weapon-kits.js stows it along the gun's left side, which reads in first
//    person only): on a body it is worn, a two-point sling from the gun's front swivel up the chest, over the left shoulder,
//    across the back and under the right arm to the rear swivel on the stock. A flat strap redrawn each pose into one small
//    buffer per operator (nothing allocated per frame), in the kit's own dyed paracord, so it follows the gun and the body
//    through idle, walk, run, crouch, reload and the throw. Its torso points sit on Spine2 (the vest's bone) at each kit's
//    bulk, so it lies on the plates of SFONDAMENTO and CORAZZA and on BOREA's padded jacket instead of sinking in.
// 2) The lanyard of the pistol and the knife hangs toward the ground and swings with the body (on the gun it kept the gun's
//    turn and floated sideways when the weapon pitched), a little larger than in first person so it reads at range.
// 3) The grenade throw: an overhand throw with the throwing (right) hand, the gun let down onto the sling in the support hand
//    (the knife keeps its hand: the support hand throws). The host frees a grenade at the release (blast-rules,
//    objective-rules, smoke-rules) and nobody else knows a throw is coming before that, so the pose's release is the
//    grenade's birth (RELEASE_MS 0): the arm is already coming over the shoulder, whips forward, follows through low across the
//    body and goes back to the gun. The flying can is seen from its first frame, starting at the hand (utility-presentation.js).
//    (V43 b34 rev: the wind-up used to play 150 ms after the real release with the can hidden, and the can then jumped 1-2 m.)
export const RELEASE_MS=0,THROW_MS=760;
// V43 b34 rev: a flat webbing strap (it was 34 mm in the cord's braid, which read as a bead necklace and vanished at range).
const SL={N:34,W:.044,H:.006};
// Torso points of the worn sling, in the operator's rest frame about Spine2 (x right, y up, z back; metres): lower and upper
// chest, the left shoulder's top, upper and middle back, under the right arm. Each kit lays them at its own surface (measured
// on the rest pose over the suit, the wear, the plates and the gear, scratchpad v43/b34/q2.js) plus a strap's clearance; a
// pack covers the back run.
const PATH=[[-.05,.02,0],[-.075,.14,0],[-.125,0,-.025],[-.075,.15,0],[.1,.03,0],[0,-.045,.05]],AXIS=[2,2,1,2,2,0],SIGN=[-1,-1,1,1,1,1];
const DEPTH={assalto:[.265,.166,.215,.152,.196,.142],ricognizione:[.219,.183,.239,.114,.223,.175],sfondamento:[.251,.166,.229,.155,.275,.192],tiratore:[.213,.166,.269,.165,.156,.142],corazza:[.295,.283,.233,.119,.092,.177],borea:[.189,.166,.277,.137,.169,.2],
 // V44 op2: the new operators, measured on each body (scratchpad v44/op2/sling.mjs: rays onto the rest pose, offset by ASSALTO's own
 // measure against its row above): MASTINO's plates, SAETTA's light armour, ONICE's suit, ASTORE's flight suit, CORVO's pack, LINCE.
 mastino:[.276,.152,.235,.157,.211,.142],saetta:[.195,.167,.215,.171,.172,.163],onice:[.264,.159,.215,.1,.157,.13],astore:[.156,.13,.215,.142,.165,.153],corvo:[.208,.119,.215,.292,.31,.154],lince:[.202,.198,.215,.131,.13,.173]},CLEAR=.013;
const V=Array.from({length:12},()=>new T.Vector3()),Q=new T.Quaternion(),Q2=new T.Quaternion(),M=new T.Matrix4();
function strapGeometry(){const n=SL.N+1,g=new T.BufferGeometry(),idx=[];
 g.setAttribute('position',new T.BufferAttribute(new Float32Array(n*8*3),3).setUsage(T.DynamicDrawUsage));g.setAttribute('normal',new T.BufferAttribute(new Float32Array(n*8*3),3).setUsage(T.DynamicDrawUsage));
 const uv=new Float32Array(n*8*2);g.setAttribute('uv',new T.BufferAttribute(uv,2).setUsage(T.DynamicDrawUsage));
 // per ring: front face 0-1, back face 2-3, right edge 4-5, left edge 6-7
 for(let i=0;i<SL.N;i++){const a=i*8,b=a+8;for(const [p,q]of [[0,1],[3,2],[5,4],[6,7]])idx.push(a+p,b+p,a+q,a+q,b+p,b+q);}
 g.setIndex(idx);g.boundingSphere=new T.Sphere(new T.Vector3(0,1,0),1.5);return g;}
// The control points: front swivel, the six torso points, rear swivel (root space).
function strapPoints(d,root,gun,front,rear,depth,pts){
 const chest=d.bones.get('Spine2'),rest=d.restChest;if(!chest||!rest)return false;
 chest.matrixWorld.decompose(V[0],Q,V[1]);Q.multiply(Q2.copy(rest).invert());M.copy(root.matrixWorld).invert();
 pts[0].fromArray(front);gun.localToWorld(pts[0]).applyMatrix4(M);pts[7].fromArray(rear);gun.localToWorld(pts[7]).applyMatrix4(M);
 const rootQ=root.getWorldQuaternion(Q2).invert();
 for(let k=0;k<PATH.length;k++){const o=V[2].fromArray(PATH[k]);o.setComponent(AXIS[k],SIGN[k]*(depth[k]+CLEAR));pts[k+1].copy(o.applyQuaternion(Q)).add(V[0]).applyMatrix4(M);}
 // the torso's axis (root space) for the strap's lie
 d.slingAxis.copy(V[0]).applyMatrix4(M);d.slingUp.set(0,1,0).applyQuaternion(Q).applyQuaternion(rootQ);d.slingFwd.set(0,0,-1).applyQuaternion(Q).applyQuaternion(rootQ);d.slingFront=depth[0]+CLEAR;
 // the lower chest point is the strap's sag between the front swivel and the chest, wherever the gun is (a fixed point bent it into a V
 // with the muzzle down), laid on the vest
 pts[1].copy(pts[0]).lerp(pts[2],.5).addScaledVector(d.slingUp,-.07);onVest(d,pts[1]);return true;}
// A point of the front run inside the vest's front (from the belly to the upper chest) comes out onto it.
function onVest(d,q){const rel=V[10].copy(q).sub(d.slingAxis),h=rel.dot(d.slingUp),f=rel.dot(d.slingFwd);if(h>-.4&&h<.12&&f<d.slingFront&&f>-.05&&rel.addScaledVector(d.slingUp,-h).addScaledVector(d.slingFwd,-f).length()<.17)q.addScaledVector(d.slingFwd,d.slingFront-f);}
function strapFill(d){
 const g=d.sling.geometry,P=g.attributes.position.array,N=g.attributes.normal.array,U=g.attributes.uv.array,c=d.slingCurve,ax=d.slingAxis,up=d.slingUp;
 const p=V[3],t=V[4],n=V[5],b=V[6],a=V[7];let s=0;
 const S=d.slingSamples??=Array.from({length:SL.N+1},()=>new T.Vector3());for(let i=0;i<=SL.N;i++)c.getPoint(i/SL.N,S[i]);
 // the run from the front swivel lies over the vest's front (its pouches), never through it, wherever the gun points
 for(let i=0;i<=SL.N*2/7;i++)onVest(d,S[i]);
 for(let i=0;i<=SL.N;i++){p.copy(S[i]);t.copy(S[Math.min(SL.N,i+1)]).sub(S[Math.max(0,i-1)]).normalize();
  if(i)s+=p.distanceTo(a);a.copy(p);
  // flat on the body: its face looks away from the torso's axis
  n.copy(p).sub(ax);n.addScaledVector(up,-n.dot(up));n.addScaledVector(t,-n.dot(t));if(n.lengthSq()<1e-8)n.set(0,0,-1);n.normalize();b.crossVectors(t,n).normalize();
  const w=SL.W/2,h=SL.H/2,o=i*24,ou=i*16,vs=s/(SL.W*4.8);
  const put=(k,sw,sh,nx,ny,nz)=>{P[o+k*3]=p.x+b.x*sw+n.x*sh;P[o+k*3+1]=p.y+b.y*sw+n.y*sh;P[o+k*3+2]=p.z+b.z*sw+n.z*sh;N[o+k*3]=nx;N[o+k*3+1]=ny;N[o+k*3+2]=nz;U[ou+k*2]=vs;U[ou+k*2+1]=sw>0?.9:.1;};
  put(0,w,h,n.x,n.y,n.z);put(1,-w,h,n.x,n.y,n.z);put(2,w,-h,-n.x,-n.y,-n.z);put(3,-w,-h,-n.x,-n.y,-n.z);put(4,w,h,b.x,b.y,b.z);put(5,w,-h,b.x,b.y,b.z);put(6,-w,h,-b.x,-b.y,-b.z);put(7,-w,-h,-b.x,-b.y,-b.z);}
 g.attributes.position.needsUpdate=g.attributes.normal.needsUpdate=g.attributes.uv.needsUpdate=true;}
const SWIVELS={1:[[-.052,.115,.2],[-.04,.035,.6]],2:[[-.023,-.04,-.015],[-.021,-.105,.215]],3:[[-.037,.088,.47],[-.037,.03,.765]]};
// The lanyard on a held pistol or knife: a damped pendulum about its swivel, pulled toward the ground, pushed by the swivel's
// own acceleration. Same pivot, rest and cone as in first person, larger.
const LIT=new T.Color(0xb7bfa4);
function hangLanyard(root,pivot,dt,depth,len,size,light=false){
 const s=pivot.userData.hang??={rest:pivot.quaternion.clone(),x:0,z:0,vx:0,vz:0,p:new T.Vector3(),v:new T.Vector3(),fresh:true,glow:pivot.getObjectByName('Kit field glow')?.material};pivot.scale.setScalar(size);
 // its light a little brighter than the world tier's (still under the bloom threshold): the charm is what reads at range
 if(s.glow&&s.glow.emissiveIntensity>0&&s.glow.emissiveIntensity<.4)s.glow.emissiveIntensity=.4;
 // V43 b34 rev: the knife's dark cord vanished in the fist at 2 m; on a body (this gun's own material) it is a paler dye,
 // re-lightened whenever a paint job re-dyes it
 if(light){const c=s.cord??=pivot.getObjectByName('Kit field cord')?.material;if(c&&c.color.getHex()!==s.lit){c.color.lerp(LIT,.55);s.lit=c.color.getHex();}}
 pivot.parent.updateWorldMatrix(false,false);const w=V[10].copy(pivot.position).applyMatrix4(pivot.parent.matrixWorld);
 if(s.fresh||!(dt>0)||dt>.15){s.p.copy(w);s.v.set(0,0,0);s.fresh=false;}
 const inv=1/Math.max(dt,1e-3),vel=V[2].copy(w).sub(s.p).multiplyScalar(inv),acc=V[3].copy(vel).sub(s.v).multiplyScalar(inv);s.p.copy(w);s.v.copy(vel);if(acc.length()>60)acc.setLength(60);
 // A gun held at the chest would hang its cord into the vest: below the swivel the cord leans out over the vest's front.
 const g=V[4].set(0,-1,0);{M.copy(root.matrixWorld).invert();const tip=V[7].copy(w).addScaledVector(g,len).applyMatrix4(M),front=-(depth+.03),k=(tip.z-front)/len;
  if(k>0){root.getWorldQuaternion(Q2);g.add(V[8].set(0,0,-1).applyQuaternion(Q2).multiplyScalar(Math.min(2.5,k*1.6))).normalize();}}
 pivot.parent.getWorldQuaternion(Q).multiply(s.rest).invert();acc.applyQuaternion(Q);g.applyQuaternion(Q);
 // the swing as a tilt vector (x, z: direction and size of the tilt from the rest cord), so a cord can hang past square
 const gr=Math.acos(Math.max(-1,Math.min(1,-g.y))),gl=Math.hypot(g.x,g.z)||1,max=2.2,gx=g.x/gl*Math.min(gr,max),gz=g.z/gl*Math.min(gr,max);
 const steps=Math.min(4,Math.ceil(dt*120)),h=Math.min(dt,.1)/steps;
 for(let k=0;k<steps;k++){s.vx+=(-81*(s.x-gx)-5.4*s.vx-acc.x*9)*h;s.vz+=(-81*(s.z-gz)-5.4*s.vz-acc.z*9)*h;s.x+=s.vx*h;s.z+=s.vz*h;const r=Math.hypot(s.x,s.z);if(r>max){s.x*=max/r;s.z*=max/r;}}
 const r=Math.hypot(s.x,s.z),sr=r>1e-6?Math.sin(r)/r:1,dir=V[5].set(s.x*sr,-Math.cos(r),s.z*sr);pivot.quaternion.copy(s.rest).multiply(Q2.setFromUnitVectors(V[6].set(0,-1,0),dir));}
// V43 b34 rev: the worn strap is flat nylon webbing in the cord's dye, darkened so it reads on pale, orange and tan suits alike
// and lit by the plain standard program (no braid map). One material per body, recoloured only when the gun's dye changes.
const WEB=new T.Color(0x1d211b);
function webbing(d,cord){const m=d.slingWeb??=Object.assign(new T.MeshStandardMaterial({roughness:.78,metalness:0}),{name:'operator-webbing'});
 const hex=cord.color.getHex();if(m.userData.from!==hex){m.userData.from=hex;m.color.copy(cord.color).lerp(WEB,.5);}return m;}
// Once a pose, at the end of animateAgent (the skeleton and the gun are current). `kit` is the operator's kit id.
export function dressAgentGear(root,dt,kit){
 const d=root.userData,gun=d.gun,index=d.weapon,field=gun?.userData.cosmeticKits?.get('field'),worn=!!field?.visible&&gun.visible&&!!SWIVELS[index];
 if(field?.visible&&(index===0||index===5)){const pivot=field.getObjectByName('Kit field pivot');if(pivot)hangLanyard(root,pivot,dt,(DEPTH[kit]||DEPTH.assalto)[0]+.045,index===0?.11:.1,index===0?1.7:2.8,index===5);}// V43 b34 rev: larger (the knife's was lost in the fist at 2 m)
 if(!worn){if(d.sling)d.sling.visible=false;return;}
 // the stowed copy on the gun gives way to the worn one
 for(const o of field.children)if(o.visible)o.visible=false;
 const cord=gun.userData.slingCord??=field.getObjectByName('Kit field cord')?.material;if(!cord)return;
 if(!d.sling){const pts=Array.from({length:8},()=>new T.Vector3());d.slingCurve=new T.CatmullRomCurve3(pts,false,'centripetal',.5);d.slingPts=pts;d.slingAxis=new T.Vector3();d.slingUp=new T.Vector3();d.slingFwd=new T.Vector3();
  const chest=d.bones.get('Spine2');d.restChest=d.dst.find(r=>r.bone===chest)?.rest||null;
  const m=new T.Mesh(strapGeometry(),cord);m.name='Operator sling';m.castShadow=false;m.receiveShadow=true;m.userData.ownedGeometry=true;root.add(m);d.sling=m;}
 d.sling.material=webbing(d,cord);const [front,rear]=SWIVELS[index];
 if(!strapPoints(d,root,gun,front,rear,DEPTH[kit]||DEPTH.assalto,d.slingPts)){d.sling.visible=false;return;}
 strapFill(d);d.sling.visible=true;}
// ---- the throw -------------------------------------------------------------------------------------------------------------
// Support-hand path in the operator's frame (x right, y up from the feet, z back), its elbow's side and the torso's turn
// (left shoulder back is +), keyed on the grenade's age in ms. Blend in over the first 90 ms, out from 400 to THROW_MS.
// V43 b34 rev: the throwing (right) hand's path; `left` mirrors it for the knife's support-hand throw. Torso turn: + brings the
// right shoulder forward. Blend in over the first 60 ms (the hand leaves the grip as the can leaves), out from 520 ms.
const KEYS=[[0,[.17,1.42,-.14],[.45,-.6,.2],0],[60,[.2,1.74,-.3],[.62,0,.35],-.1],[180,[.06,1.52,-.56],[.55,-.2,-.2],.36],[340,[-.07,1.15,-.4],[.3,-.6,0],.26],[540,[.07,1.22,-.26],[.4,-.65,.1],.08],[THROW_MS,[.16,1.4,-.13],[.45,-.7,.2],0]];
const ease=x=>x*x*(3-2*x),sm=(x,a,b)=>ease(Math.min(1,Math.max(0,(x-a)/(b-a))));
const TH={w:0,hand:new T.Vector3(),pole:new T.Vector3(),twist:0,lower:0,carry:false,open:false,left:false};
export function throwPhase(age,left=false){
 if(!(age>=0)||age>=THROW_MS)return null;let k=0;while(k<KEYS.length-2&&age>KEYS[k+1][0])k++;const A=KEYS[k],B=KEYS[k+1],f=ease(Math.min(1,(age-A[0])/Math.max(1,B[0]-A[0])));
 TH.hand.fromArray(A[1]).lerp(V[0].fromArray(B[1]),f);TH.pole.fromArray(A[2]).lerp(V[0].fromArray(B[2]),f);TH.twist=A[3]+(B[3]-A[3])*f;
 if(left){TH.hand.x=-TH.hand.x;TH.pole.x=-TH.pole.x;TH.twist=-TH.twist;}TH.left=left;
 TH.w=sm(age,0,60)*(1-sm(age,520,THROW_MS));TH.lower=TH.w;TH.carry=false;TH.open=age<320;return TH;}
// The can in the hand until the release, in the colour of the grenade's own can (utility-presentation.js).
const CANS={},canGeo=()=>CANS.geo??=new T.CylinderGeometry(.036,.036,.11,10);
const canLook=kind=>CANS[kind]??=Object.assign(new T.MeshStandardMaterial(kind==='smoke'?{color:0x5d6b5a,metalness:.35,roughness:.6}:kind==='he'?{color:0x3a4a3c,metalness:.5,roughness:.5}:kind==='fire'?{color:0x8a2f22,metalness:.4,roughness:.55}:{color:0x96a3a0,metalness:.65,roughness:.46}),{name:'held-'+kind,userData:{teamLook:true}});
// V43 b34 rev: the throwing hand's palm in the world, every pose, is where a can this body throws is first drawn; the held can
// itself is no longer shown (the release is the grenade's birth), the code stays for a future pre-release signal.
export function heldCan(root,hand,palm,kind,show){
 const d=root.userData;if(!show){if(d.heldCan)d.heldCan.visible=false;if(hand){hand.updateWorldMatrix(false,false);hand.localToWorld((d.throwHand??=new T.Vector3()).copy(palm));}return;}
 if(!d.heldCan){d.heldCan=new T.Mesh(canGeo(),canLook('flash'));d.heldCan.name='Held grenade';d.heldCan.castShadow=true;d.heldCan.userData.ownedGeometry=false;root.add(d.heldCan);}
 const m=d.heldCan;m.material=canLook(kind);const w=V[0].copy(palm);hand.localToWorld(w);(d.throwHand??=new T.Vector3()).copy(w);
 root.updateWorldMatrix(false,false);m.position.copy(root.worldToLocal(V[1].copy(w)));hand.matrixWorld.decompose(V[2],Q,V[3]);m.quaternion.copy(root.getWorldQuaternion(Q2).invert().multiply(Q));m.visible=true;}
