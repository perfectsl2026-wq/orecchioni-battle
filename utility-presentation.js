import {groundHeight} from './shared.js?v=38.2';
import {createWeapon} from './graphics.js?v=38.2';
import * as T from './vendor/three.module.js';
export class UtilityPresentation{
 constructor(scene){
  this.scene=scene;this.grenades=new Map();this.lastStatus='';this.lastBeep=0;
  const metal=new T.MeshStandardMaterial({color:0x96a3a0,metalness:.65,roughness:.46}),dark=new T.MeshStandardMaterial({color:0x253c3d,roughness:.88}),led=new T.MeshBasicMaterial({color:0xe56d42});
  this.flashGeometry=new T.CylinderGeometry(.055,.055,.15,10);this.metal=metal;this.dark=dark;this.smokeCan=new T.MeshStandardMaterial({color:0x5d6b5a,metalness:.35,roughness:.6});this.heShell=new T.MeshStandardMaterial({color:0x3a4a3c,metalness:.5,roughness:.5});this.fireCan=new T.MeshStandardMaterial({color:0x8a2f22,metalness:.4,roughness:.55});this.drops=new Map();this.dropGeometry=new Map();
  this.bomb=new T.Group();const body=new T.Mesh(new T.BoxGeometry(.34,.16,.24),dark);body.position.y=.10;this.bomb.add(body);
  for(const x of [-.095,0,.095]){const charge=new T.Mesh(new T.CylinderGeometry(.035,.035,.27,10),metal);charge.rotation.x=Math.PI/2;charge.position.set(x,.12,0);this.bomb.add(charge);}
  const display=new T.Mesh(new T.BoxGeometry(.12,.012,.075),new T.MeshBasicMaterial({color:0x668d79}));display.position.set(0,.19,.025);this.bomb.add(display);
  this.led=new T.Mesh(new T.SphereGeometry(.018,8,6),led);this.led.position.set(.14,.18,.08);this.bomb.add(this.led);this.bomb.visible=false;scene.add(this.bomb);
  this.blast=new T.Mesh(new T.SphereGeometry(1,16,10),new T.MeshBasicMaterial({color:0xe2c79b,transparent:true,opacity:0,depthWrite:false}));this.blast.visible=false;scene.add(this.blast);this.blastAt=-Infinity;
 }
 update(state,now,dt){
  const live=new Set();for(const g of state.grenades||[]){live.add(g.id);let mesh=this.grenades.get(g.id);if(!mesh){mesh=new T.Mesh(this.flashGeometry,g.kind==='smoke'?this.smokeCan:g.kind==='he'?this.heShell:g.kind==='fire'?this.fireCan:this.metal);mesh.position.set(g.x,g.y,g.z);this.scene.add(mesh);this.grenades.set(g.id,mesh);}mesh.position.x+=(g.x-mesh.position.x)*(1-Math.exp(-30*dt));mesh.position.y+=(g.y-mesh.position.y)*(1-Math.exp(-30*dt));mesh.position.z+=(g.z-mesh.position.z)*(1-Math.exp(-30*dt));mesh.rotation.set(now*.009,0,now*.007);}
  for(const [id,mesh]of this.grenades)if(!live.has(id)){mesh.removeFromParent();this.grenades.delete(id);}
  // Dropped primaries: the low-poly weapon lying on its side where it fell.
  const drops=new Set();for(const d of state.drops||[]){drops.add(d.id);if(!this.drops.has(d.id)){const m=createWeapon(d.weapon,false);m.position.set(d.x,(d.y||0)+.06,d.z);m.rotation.set(0,(d.yaw||0)+.6,Math.PI/2*.92);m.traverse(o=>{if(o.isMesh)o.castShadow=true;});this.scene.add(m);this.drops.set(d.id,m);}}
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
